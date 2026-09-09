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
  limits: { fileSize: 50 * 1024 * 1024 }
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
        const zipPath = req.file?.path;
        if (!zipPath) {
          return res.status(400).json({ error: { code: 'NO_FILE', message: 'No ZIP file received — ensure Content-Type is multipart/form-data' } });
        }
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

  // GET /workspaces/:id/export - export workspace as ZIP
  router.get('/:id/export', async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      
      const archiver = (await import('archiver')).default;
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.attachment(`${ws.name}.zip`);
      archive.pipe(res);
      archive.directory(ws.diskPath, false);
      
      archive.on('error', (err) => next(err));
      await archive.finalize();
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/branches - list git branches
  router.get('/:id/branches', async (req, res, next) => {
    try {
      let ws = null;
      try {
        ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      } catch {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      }
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      
      try {
        const git = (await import('simple-git')).default;
        const branches = await git(ws.diskPath).branchLocal();
        return res.json({ branches: branches.all || [], current: branches.current || ws.branch || 'main' });
      } catch {
        // Not a git repository or disk path missing — fallback to workspace default branch
        return res.json({ branches: [ws.branch || 'main'], current: ws.branch || 'main' });
      }
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces/:id/checkout - checkout or create branch
  router.post('/:id/checkout', async (req, res, next) => {
    try {
      const { branch, create } = req.body;
      if (!branch) return res.status(400).json({ error: { code: 'VALIDATION', message: 'branch required' }});
      
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      
      const git = (await import('simple-git')).default;
      if (create) {
        await git(ws.diskPath).checkoutLocalBranch(branch);
      } else {
        await git(ws.diskPath).checkout(branch);
      }
      
      await db().workspace.update({ _id: ws._id }, { branch });
      res.json({ ok: true, branch });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces/:id/push - commit and push
  // For git-cloned workspaces: uses stored ws.gitUrl
  // For zip-uploaded workspaces: accepts githubRepo in body, inits git if needed
  router.post('/:id/push', async (req, res, next) => {
    try {
      const { message, branch, githubRepo } = req.body;
      if (!message || !branch) return res.status(400).json({ error: { code: 'VALIDATION', message: 'message and branch required' }});
      
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });

      // Fetch the oauth token to construct authenticated url
      const githubAcc = await db().githubAccount.findOne({ userId: req.userId });
      if (!githubAcc) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'GitHub not connected' }});
      
      const { decrypt } = await import('../secret-enc.js');
      const token = decrypt(githubAcc.accessToken, secret);

      const git = (await import('simple-git')).default(ws.diskPath);
      await git.addConfig('user.name', githubAcc.username);
      await git.addConfig('user.email', `${githubAcc.username}@users.noreply.github.com`);

      // Determine the target repo URL
      let authUrl;
      const repoUrl = ws.gitUrl || githubRepo;
      if (!repoUrl) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'No repository URL — provide githubRepo or clone from git' }});
      }
      authUrl = repoUrl.replace('https://', `https://${token}@`);

      // For zip-uploaded workspaces, initialize git repo and set remote
      if (!ws.gitUrl) {
        await git.init();
        await git.addRemote('origin', authUrl);
        // Update the workspace with the new git URL so future pushes work
        await db().workspace.updateOne(
          { _id: ws._id },
          { $set: { gitUrl: repoUrl } }
        );
      }

      await git.add('.');
      await git.commit(message);
      
      await git.push(authUrl, branch);
      
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces/:id/upload - upload arbitrary files (images, docs, code) to workspace root
  router.post('/:id/upload', upload.array('files'), async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      
      const { copyFile } = await import('node:fs/promises');
      const uploadedFiles = [];

      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          // For simplicity, we just copy them to the workspace root
          const dest = safeJoin(ws.diskPath, file.originalname);
          await copyFile(file.path, dest);
          uploadedFiles.push(file.originalname);
        }
      }

      res.json({ ok: true, uploadedFiles });
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
