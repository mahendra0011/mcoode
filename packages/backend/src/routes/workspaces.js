import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { join } from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

const WORKSPACE_ROOT = join(homedir(), 'mcode-workspaces');
const UPLOADS_DIR = join(homedir(), '.mcode', 'uploads');

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname?.toLowerCase().endsWith('.zip')) cb(null, true);
    else cb(new Error('only .zip files are allowed'), false);
  }
});

export function workspaceRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  // GET /workspaces — list user's workspaces
  router.get('/', async (req, res, next) => {
    try {
      const workspaces = await db().workspace.find({ userId: req.userId });
      res.json({ workspaces });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces — create from ZIP (multipart) or Git (JSON)
  router.post('/', upload.single('zipfile'), async (req, res, next) => {
    try {
      const { name, source, repoUrl, branch, branchName, zipFilename } = req.body;
      if (!name || !source) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'name and source are required' } });
      }

      const workspaceId = randomBytes(6).toString('hex');
      const diskPath = join(WORKSPACE_ROOT, workspaceId);
      await mkdir(diskPath, { recursive: true });

      let gitUrl = null;
      let branchResult = branch || 'main';

      if (source === 'zip') {
        const zipPath = req.file?.path || join(UPLOADS_DIR, zipFilename);
        await extractZipTo(zipPath, diskPath);
      } else if (source === 'git') {
        if (!repoUrl) {
          return res.status(400).json({ error: { code: 'VALIDATION', message: 'repoUrl required for git source' } });
        }
        gitUrl = repoUrl;
        branchResult = branch;
        await cloneRepo(repoUrl, diskPath, { branch: branchResult, branchName });
      }

      const ws = await db().workspace.create({
        userId: req.userId,
        name,
        diskPath,
        gitUrl,
        branch: branchResult,
        status: 'active'
      });
      res.status(201).json({ workspace: ws });
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/files — recursive file listing
  router.get('/:id/files', async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const files = await walkDir(ws.diskPath);
      res.json({ files });
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/file?path=... — read a file
  router.get('/:id/file', async (req, res, next) => {
    try {
      const { path } = req.query;
      if (!path) return res.status(400).json({ error: { code: 'VALIDATION', message: 'path query param required' } });
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const full = safeJoin(ws.diskPath, path);
      const content = await readFile(full, 'utf8');
      res.json({ path, content });
    } catch (err) {
      if (err.code === 'ENOENT') return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'file not found' } });
      next(err);
    }
  });

  // PUT /workspaces/:id/file?path=... — write a file
  router.put('/:id/file', async (req, res, next) => {
    try {
      const { path } = req.query;
      const { content } = req.body;
      if (!path) return res.status(400).json({ error: { code: 'VALIDATION', message: 'path query param required' } });
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const full = safeJoin(ws.diskPath, path);
      await mkdir(join(full, '..'), { recursive: true });
      await writeFile(full, content || '', 'utf8');
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

/** Walk a directory tree and return relative file paths (excludes node_modules, .git, dist, build, coverage). */
async function walkDir(dir, base = '') {
  const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next', '.svelte-kit']);
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await walkDir(full, rel));
    } else {
      files.push({ path: rel, name: entry.name });
    }
  }
  return files;
}

/** Join and ensure the path stays within the workspace root (path traversal protection). */
function safeJoin(root, p) {
  const rootResolved = root.replace(/\\/g, '/');
  let rel = String(p || '').replace(/\\/g, '/');
  // Strip leading ./ and any attempt to escape with ../
  rel = rel.replace(/^\.\//, '');
  const parts = rel.split('/');
  const filtered = [];
  for (const part of parts) {
    if (part === '..') continue;
    if (part === '') continue;
    filtered.push(part);
  }
  return join(rootResolved, ...filtered);
}

/** Extract a ZIP archive to a directory using unzipper. */
async function extractZipTo(zipPath, destDir) {
  const { default: unzipper } = await import('unzipper');
  await new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(unzipper.Extract({ path: destDir }))
      .on('close', resolve)
      .on('error', reject);
  });
}

/** Clone a git repo to a directory with optional branch selection. */
async function cloneRepo(repoUrl, destDir, opts = {}) {
  const git = (await import('simple-git')).default;
  const cloneOpts = { '--depth': '1' };
  if (opts.branch && opts.branch !== 'current') {
    cloneOpts['--branch'] = opts.branchName || opts.branch;
  }
  await git().silent(true).clone(repoUrl, destDir, cloneOpts);
}
