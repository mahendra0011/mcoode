import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '../auth.js';
import { db } from '../db.js';
import { join } from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

import { mkdirSync } from 'node:fs';

const WORKSPACE_ROOT = join(homedir(), 'mcode-workspaces');
const UPLOADS_DIR = join(homedir(), '.mcode', 'uploads');

// Ensure destination directories exist on disk before Multer streams files
try {
  mkdirSync(WORKSPACE_ROOT, { recursive: true });
  mkdirSync(UPLOADS_DIR, { recursive: true });
} catch {}

// 50MB was too tight for "upload whole project" — any real project with a few images,
// fonts, or a lockfile-heavy zip would silently fail this limit mid-upload, which is
// part of what made folder upload feel like it randomly "gets stuck". Multer streams
// to disk (dest: UPLOADS_DIR, not memory storage), so raising this only costs disk
// space, not server RAM. Configurable via env for deployments with tighter constraints.
const MAX_UPLOAD_MB = Number(process.env.MCODE_MAX_UPLOAD_MB) || 1024;

const upload = multer({
  dest: UPLOADS_DIR,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024 }
});

const handleZipfileUpload = (req, res, next) => {
  upload.single('zipfile')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: `ZIP file exceeds maximum upload limit of ${MAX_UPLOAD_MB}MB` } });
      }
      return res.status(400).json({ error: { code: 'UPLOAD_ERROR', message: err.message || 'File upload error' } });
    }
    next();
  });
};

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
  router.post('/', handleZipfileUpload, async (req, res, next) => {
    try {
      const { name, source, repoUrl, branch, branchName, zipFilename, uploadId } = req.body;
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
        await extractZipTo(zipPath, diskPath, uploadId);
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

  // DELETE /workspaces/:id/file?path=... — delete a file or directory
  router.delete('/:id/file', async (req, res, next) => {
    try {
      const { path } = req.query;
      if (!path) return res.status(400).json({ error: { code: 'VALIDATION', message: 'path query param required' } });
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const full = safeJoin(ws.diskPath, path);
      const { rm } = await import('node:fs/promises');
      await rm(full, { recursive: true, force: true });
      res.json({ ok: true, deleted: path });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces/:id/rename-file — rename a file or directory
  router.post('/:id/rename-file', async (req, res, next) => {
    try {
      const { oldPath, newPath } = req.body;
      if (!oldPath || !newPath) return res.status(400).json({ error: { code: 'VALIDATION', message: 'oldPath and newPath required' } });
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const oldFull = safeJoin(ws.diskPath, oldPath);
      const newFull = safeJoin(ws.diskPath, newPath);
      const { rename, mkdir: mkDir } = await import('node:fs/promises');
      await mkDir(join(newFull, '..'), { recursive: true });
      await rename(oldFull, newFull);
      res.json({ ok: true, oldPath, newPath });
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

  // POST /workspaces/:id/upload - upload arbitrary files or entire folder tree
  router.post('/:id/upload', upload.array('files', 2000), async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      
      const { copyFile, mkdir: mkDir } = await import('node:fs/promises');
      const uploadedFiles = [];

      let relativePaths = [];
      if (req.body.relativePaths) {
        try {
          relativePaths = typeof req.body.relativePaths === 'string' ? JSON.parse(req.body.relativePaths) : req.body.relativePaths;
        } catch {
          relativePaths = [];
        }
      }

      if (req.files && req.files.length > 0) {
        // Copy files with bounded concurrency instead of one-at-a-time — mirrors the
        // 32-concurrency pattern already used in extractZipTo() below for consistency.
        const CONCURRENCY = 32;
        for (let i = 0; i < req.files.length; i += CONCURRENCY) {
          const chunk = req.files.slice(i, i + CONCURRENCY);
          const chunkResults = await Promise.all(chunk.map(async (file, idx) => {
            const globalIdx = i + idx;
            const rawRelPath = relativePaths[globalIdx] || file.originalname;
            // Strip top-level folder name if webkitRelativePath includes root folder prefix
            const relPath = rawRelPath.includes('/') ? rawRelPath.split('/').slice(1).join('/') || rawRelPath : rawRelPath;
            const dest = safeJoin(ws.diskPath, relPath);
            await mkDir(join(dest, '..'), { recursive: true });
            await copyFile(file.path, dest);
            return relPath;
          }));
          uploadedFiles.push(...chunkResults);
        }
      }

      res.json({ ok: true, uploadedFiles });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

const GLOBAL_SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build',
  'coverage', '.cache', 'vendor', 'venv', '.venv', '__pycache__',
  '.turbo', 'out', '.idea', '.vscode', 'tmp', 'temp',
  'target', '.target', '.gradle', '.cargo', '.nuget', '.output',
  'bower_components', 'jspm_packages', '.expo', '.serverless',
  '.swc', 'obj', 'bin', '.yarn', '.pnpm-store'
]);

/** Walk a directory tree and return relative file paths (excludes node_modules, .git, etc.). */
async function walkDir(dir, base = '') {
  const files = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (GLOBAL_SKIP_DIRS.has(entry.name)) continue;
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

/** Emit a workspace-upload progress event to whichever client joined this upload's
 *  room (see 'upload:join' in sockets.js). Best-effort — if socket.io isn't attached
 *  yet or the client didn't join, this is a silent no-op, upload still succeeds. */
function emitUploadProgress(uploadId, payload) {
  if (!uploadId) return;
  const io = globalThis.__mcodeIo;
  if (!io) return;
  io.to(`upload:${uploadId}`).emit('workspace:upload-progress', payload);
}

/** Extract a ZIP archive to a directory using parallel 32-concurrency disk writes.
 *  Reports { phase: 'extracting', extracted, total } after every chunk so the client
 *  isn't left staring at a static "uploading..." message while the server is actually
 *  still busy writing thousands of files to disk (this used to be a silent gap of
 *  several seconds to tens of seconds for bigger projects). */
async function extractZipTo(zipPath, destDir, uploadId) {
  const { Open } = await import('unzipper');
  const directory = await Open.file(zipPath);
  const CONCURRENCY = 32;
  const entries = directory.files;

  emitUploadProgress(uploadId, { phase: 'extracting', extracted: 0, total: entries.length });

  let extracted = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (entry) => {
        const normPath = entry.path.replace(/\\/g, '/');
        const parts = normPath.split('/');
        if (parts.some(p => GLOBAL_SKIP_DIRS.has(p))) return;

        const fullPath = safeJoin(destDir, entry.path);
        if (entry.type === 'Directory') {
          await mkdir(fullPath, { recursive: true });
        } else {
          await mkdir(join(fullPath, '..'), { recursive: true });
          const buffer = await entry.buffer();
          await writeFile(fullPath, buffer);
        }
      })
    );
    extracted = Math.min(i + CONCURRENCY, entries.length);
    emitUploadProgress(uploadId, { phase: 'extracting', extracted, total: entries.length });
  }
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
