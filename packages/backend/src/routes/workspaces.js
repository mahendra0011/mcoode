import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import { deriveMasterKey, decryptKey } from '../secret-enc.js';
import { uploadSingle, uploadFieldArray, UPLOADS_DIR } from '../upload-config.js';
import { db } from '../db.js';
import { httpError } from '../http-error.js';
import { join, resolve as resolvePath, sep as pathSep } from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync, symlinkSync, rmSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

const WORKSPACE_ROOT = join(homedir(), 'mcode-workspaces');

// Ensure destination directories exist on disk before Multer streams files.
// WS-003: 0700 — on a shared server, other users must not browse workspaces.
try {
  mkdirSync(WORKSPACE_ROOT, { recursive: true, mode: 0o700 });
  mkdirSync(UPLOADS_DIR, { recursive: true, mode: 0o700 });
} catch {}
import('node:fs/promises').then(({ chmod }) => {
  chmod(WORKSPACE_ROOT, 0o700).catch(() => {});
  chmod(UPLOADS_DIR, 0o700).catch(() => {});
});

// WS-004: remember attempted junctions so GET / doesn't redo O(n) fs probes
// on every request (existsSync results never change for a live workspace).
const junctionCache = new Set();
function ensureNamedJunction(name, diskPath) {
  if (!name || !diskPath) return;
  try {
    const sanitized = String(name).trim().replace(/[\\/:*?"<>|]/g, '-');
    // SEC-023: Windows reserved device names (COM1, LPT1, AUX, NUL, …)
    // lock up the filesystem — never use them as link names.
    if (!sanitized || junctionCache.has(sanitized) || /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i.test(sanitized)) return;
    const linkPath = join(WORKSPACE_ROOT, sanitized);
    // WS-005: the 'junction' type is Windows-only in name — Node ignores it
    // elsewhere and creates a regular symlink. No action needed.
    if (!existsSync(linkPath) && existsSync(diskPath)) {
      symlinkSync(diskPath, linkPath, 'junction');
    }
    junctionCache.add(sanitized);
  } catch {}
}

// Shared upload policy lives in upload-config.js (single 50MB default via
// MCODE_MAX_UPLOAD_MB, zip-only gate, sanitized names). The old local 1024MB
// ad-hoc multer stack was removed — one service, one limit, one MIME rule.
const handleZipfileUpload = uploadSingle('zipfile');

export function workspaceRoutes({ secret }) {
  const router = Router();
  router.use(authMiddleware({ secret }));

  // GET /workspaces — list user's workspaces (sorted newest first)
  router.get('/', async (req, res, next) => {
    try {
      const workspaces = await db().workspace.find({ userId: req.userId });
      if (Array.isArray(workspaces)) {
        for (const ws of workspaces) {
          if (ws?.name && ws?.diskPath) {
            ensureNamedJunction(ws.name, ws.diskPath);
          }
        }
        workspaces.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
          const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
          return timeB - timeA;
        });
      }
      res.json({ workspaces });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces — create from ZIP (multipart) or Git (JSON)
  router.post('/', handleZipfileUpload, async (req, res, next) => {
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
      } else if (source === 'duplicate') {
        // WS-012: bound the inline-file body (count + per-file + total).
        const files = Array.isArray(req.body.files) ? req.body.files.slice(0, 1000) : [];
        const { writeFile } = await import('node:fs/promises');
        const { dirname } = await import('node:path');
        let writtenBytes = 0;
        for (const f of files) {
          if (f && f.path) {
            const text = String(f.content || '');
            if (text.length > 5_000_000) {
              throw httpError(413, 'duplicate file exceeds 5MB inline limit');
            }
            writtenBytes += text.length;
            if (writtenBytes > 100_000_000) {
              throw httpError(413, 'duplicate body exceeds 100MB total');
            }
            const target = safeJoin(diskPath, f.path);
            await mkdir(dirname(target), { recursive: true });
            await writeFile(target, text, 'utf8');
          }
        }
      }

      // If a workspace with the same name already exists for this user,
      // update its files/diskPath and metadata seamlessly instead of failing with a duplicate key error.
      const existing = await db().workspace.findOne({ userId: req.userId, name });
      let ws;
      if (existing) {
        if (existing.diskPath && existing.diskPath !== diskPath) {
          try {
            const { rm } = await import('node:fs/promises');
            await rm(existing.diskPath, { recursive: true, force: true });
          } catch {}
        }
        await db().workspace.findByIdAndUpdate(existing._id, {
          diskPath,
          gitUrl,
          branch: branchResult,
          status: 'active'
        });
        ws = await db().workspace.findById(existing._id) || { ...existing, diskPath, gitUrl, branch: branchResult, status: 'active' };
      } else {
        ws = await db().workspace.create({
          userId: req.userId,
          name,
          diskPath,
          gitUrl,
          branch: branchResult,
          status: 'active'
        });
      }
      ensureNamedJunction(ws?.name, ws?.diskPath);
      res.status(201).json({ workspace: ws });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({
          error: {
            code: 'DUPLICATE',
            message: `A workspace named "${req.body.name}" already exists. Please choose a different name.`
          }
        });
      }
      console.error('[workspaces] POST / failed:', err);
      next(err);
    }
  });

  // GET /workspaces/:id/files — recursive file listing
  router.get('/:id/files', async (req, res, next) => {
    try {
      let ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const files = await walkDir(ws.diskPath);
      res.json({ files });
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/search — search file contents on disk across workspace
  router.get('/:id/search', async (req, res, next) => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      if (!q.trim()) return res.json({ results: [] });

      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });

      const matchCase = req.query.matchCase === 'true';
      const wholeWord = req.query.wholeWord === 'true';
      const useRegex = req.query.useRegex === 'true';
      const includeFilter = typeof req.query.include === 'string' ? req.query.include : '';
      const excludeFilter = typeof req.query.exclude === 'string' ? req.query.exclude : '';

      const includes = includeFilter ? includeFilter.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
      const excludes = excludeFilter ? excludeFilter.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];

      let regex;
      try {
        let pattern = useRegex ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (wholeWord) pattern = `\\b${pattern}\\b`;
        regex = new RegExp(pattern, matchCase ? 'g' : 'gi');
      } catch {
        return res.status(400).json({ error: { code: 'INVALID_REGEX', message: 'Invalid search expression' } });
      }

      const files = await walkDir(ws.diskPath);
      const results = [];
      const MAX_TOTAL_MATCHES = 2000;
      const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB limit per file

      for (const file of files) {
        if (results.length >= MAX_TOTAL_MATCHES) break;
        const lowerPath = file.path.toLowerCase();
        if (includes.length > 0 && !includes.some(inc => lowerPath.includes(inc))) continue;
        if (excludes.length > 0 && excludes.some(exc => lowerPath.includes(exc))) continue;

        try {
          const fullPath = safeJoin(ws.diskPath, file.path);
          const content = await readFile(fullPath, 'utf8');
          if (content.length > MAX_FILE_SIZE) continue;

          const lines = content.split('\n');
          for (let idx = 0; idx < lines.length; idx++) {
            if (results.length >= MAX_TOTAL_MATCHES) break;
            const lineText = lines[idx];
            regex.lastIndex = 0;
            let match;
            while ((match = regex.exec(lineText)) !== null) {
              results.push({
                path: file.path,
                fileName: file.name || file.path.split('/').pop() || file.path,
                line: idx + 1,
                lineText,
                matchStart: match.index,
                matchEnd: match.index + match[0].length,
              });
              if (!regex.global) break;
              if (results.length >= MAX_TOTAL_MATCHES) break;
            }
          }
        } catch {
          // Skip unreadable or binary files
        }
      }

      res.json({ results });
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

  // POST /workspaces/:id/file — create a file (and parent directories)
  router.post('/:id/file', async (req, res, next) => {
    try {
      const filePath = req.body?.path || req.query?.path;
      let content = '';
      if (typeof req.body === 'string') {
        content = req.body;
      } else if (req.body && typeof req.body.content === 'string') {
        content = req.body.content;
      } else if (req.body && req.body.content !== undefined) {
        content = String(req.body.content);
      }
      if (!filePath) return res.status(400).json({ error: { code: 'VALIDATION', message: 'path is required' } });

      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });

      const full = safeJoin(ws.diskPath, filePath);
      await mkdir(join(full, '..'), { recursive: true });
      await writeFile(full, content, 'utf8');

      try {
        await db().workspace.updateOne({ _id: ws._id }, { updatedAt: new Date() });
      } catch {}

      res.status(201).json({ ok: true, path: filePath });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces/:id/folder — create a directory
  router.post('/:id/folder', async (req, res, next) => {
    try {
      const folderPath = req.body?.path || req.query?.path;
      if (!folderPath) return res.status(400).json({ error: { code: 'VALIDATION', message: 'path is required' } });

      let ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });

      const full = safeJoin(ws.diskPath, folderPath);
      await mkdir(full, { recursive: true });
      try {
        await writeFile(join(full, '.keep'), '', 'utf8');
      } catch {}

      res.status(201).json({ ok: true, path: folderPath });
    } catch (err) {
      next(err);
    }
  });

  // PUT /workspaces/:id/file?path=... — write a file
  router.put('/:id/file', async (req, res, next) => {
    try {
      const pathParam = req.query.path || req.body?.path;
      let content = '';
      if (typeof req.body === 'string') {
        content = req.body;
      } else if (req.body && typeof req.body.content === 'string') {
        content = req.body.content;
      } else if (req.body && req.body.content !== undefined) {
        content = String(req.body.content);
      }
      if (!pathParam) return res.status(400).json({ error: { code: 'VALIDATION', message: 'path query param required' } });

      let ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });

      const full = safeJoin(ws.diskPath, pathParam);
      await mkdir(join(full, '..'), { recursive: true });
      await writeFile(full, content, 'utf8');

      try {
        await db().workspace.updateOne({ _id: ws._id }, { updatedAt: new Date() });
      } catch {}

      res.json({ ok: true, path: pathParam });
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
      // WS-013: safeJoin already rejects `..`/absolute/empty, but refuse the
      // workspace root itself explicitly — rm -rf on it must be impossible.
      if (resolvePath(full) === resolvePath(ws.diskPath)) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'refusing to delete the workspace root — delete files inside it' } });
      }
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
      const { existsSync: existsSyncFs } = await import('node:fs');
      // WS-014: never silently clobber the rename target.
      if (existsSyncFs(newFull)) {
        return res.status(409).json({ error: { code: 'TARGET_EXISTS', message: 'target path already exists — delete or rename it first' } });
      }
      await mkDir(join(newFull, '..'), { recursive: true });
      await rename(oldFull, newFull);
      res.json({ ok: true, oldPath, newPath });
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/ports/:port/check — check if a port is open/listening
  router.get('/:id/ports/:port/check', async (req, res, next) => {
    try {
      const net = await import('node:net');
      const port = Number(req.params.port);
      if (isNaN(port) || port <= 0 || port > 65535) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid port' } });
      }
      const isOpen = await new Promise((resolve) => {
        const socket = net.createConnection({ port, host: '127.0.0.1' }, () => {
          socket.end();
          resolve(true);
        });
        socket.on('error', () => resolve(false));
        socket.setTimeout(1000, () => { socket.destroy(); resolve(false); });
      });
      res.json({ port, open: isOpen });
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/export - export workspace as ZIP
  // WS-010: refuse absurd workspaces (1GB+ on disk) instead of streaming
  // gigabytes into a response and exhausting memory/bandwidth.
  router.get('/:id/export', async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const tooBig = await workspaceExceedsBytes(ws.diskPath, 1_000_000_000);
      if (tooBig) {
        return res.status(413).json({ error: { code: 'WORKSPACE_TOO_LARGE', message: 'workspace exceeds the 1GB export limit — remove build artifacts and retry' } });
      }

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
        const git = await simpleGit();
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
      
      const git = await simpleGit();
      if (create) {
        await git(ws.diskPath).checkoutLocalBranch(branch);
      } else {
        // WS-008: shallow clones lack remote branches — fetch first so
        // checkout works instead of failing on missing history.
        try {
          await git(ws.diskPath).fetch('origin', branch);
        } catch {
          /* already local or offline — checkout below decides */
        }
        await git(ws.diskPath).checkout(branch);
      }
      
      await db().workspace.update({ _id: ws._id }, { branch });
      res.json({ ok: true, branch });
    } catch (err) {
      next(err);
    }
  });

  // GET /workspaces/:id/diff?path=... — unified git diff for a file (or repo)
  router.get('/:id/diff', async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const git = await simpleGit(ws.diskPath);
      const isRepo = await git.checkIsRepo().catch(() => false);
      if (!isRepo) return res.status(400).json({ error: { code: 'NOT_A_REPO', message: 'workspace is not a git repo' } });
      const file = typeof req.query.path === 'string' ? req.query.path : null;
      if (file) safeJoin(ws.diskPath, file);
      const diff = await git.diff(file ? ['--', file] : []);
      res.json({ diff });
    } catch (err) {
      next(err);
    }
  });
  // POST /workspaces/:id/hunks — apply selected unified-diff hunks to a file.
  // Body: { path, hunks: [{ oldStart, lines: [...] }], selected: [bool] }.
  // Same algorithm as the web DiffReviewModal (single implementation for
  // CLI/TUI reuse); unselected regions keep original content.
  router.post('/:id/hunks', async (req, res, next) => {
    try {
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      const relPath = req.body?.path;
      const hunks = req.body?.hunks;
      const selected = req.body?.selected;
      if (!relPath || !Array.isArray(hunks) || !Array.isArray(selected) || hunks.length !== selected.length) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'path, hunks[] and matching selected[] are required' } });
      }
      const full = safeJoin(ws.diskPath, relPath);
      const original = await readFile(full, 'utf8').catch(() => null);
      if (original === null) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'file not found' } });
      const src = original.split('\n');
      const out = [];
      let cursor = 0;
      hunks.forEach((h, i) => {
        const start = Math.max(0, Number(h.oldStart || 1) - 1);
        while (cursor < start && cursor < src.length) out.push(src[cursor++]);
        const lines = Array.isArray(h.lines) ? h.lines : [];
        if (!selected[i]) {
          let span = 0;
          for (const l of lines) {
            if (String(l).startsWith(' ') || String(l).startsWith('-')) span++;
          }
          const end = Math.min(src.length, start + span);
          while (cursor < end) out.push(src[cursor++]);
          return;
        }
        for (const raw of lines) {
          const l = String(raw);
          if (l.startsWith(' ')) out.push(src[cursor++] ?? l.slice(1));
          else if (l.startsWith('-')) cursor++;
          else if (l.startsWith('+')) out.push(l.slice(1));
        }
      });
      while (cursor < src.length) out.push(src[cursor++]);
      await mkdir(join(full, '..'), { recursive: true });
      await writeFile(full, out.join('\n'), 'utf8');
      try {
        await db().workspace.updateOne({ _id: ws._id }, { updatedAt: new Date() });
      } catch {}
      res.json({ ok: true, applied: selected.filter(Boolean).length, of: hunks.length });
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
      
      const { decryptKey: decKey, deriveMasterKey: deriveKey } = await import('../secret-enc.js');
      const masterKey = deriveKey(secret, req.userId);
      const token = decKey(githubAcc.accessToken, masterKey);

      const git = await simpleGit(ws.diskPath);
      await git.addConfig('user.name', githubAcc.username);
      await git.addConfig('user.email', `${githubAcc.username}@users.noreply.github.com`);

      // Determine the target repo URL (plain — auth travels via header, WS-006)
      const repoUrl = ws.gitUrl || githubRepo;
      if (!repoUrl) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'No repository URL — provide githubRepo or clone from git' }});
      }

      // For zip-uploaded workspaces, initialize git repo and set remote
      if (!ws.gitUrl) {
        await git.init();
        await git.addRemote('origin', repoUrl);
        // Update the workspace with the new git URL so future pushes work
        await db().workspace.updateOne(
          { _id: ws._id },
          { $set: { gitUrl: repoUrl } }
        );
      }

      // WS-006: authenticate via http.extraHeader (base64 x-access-token),
      // never via a token-bearing remote URL (which leaks into `git remote -v`,
      // process listings, and shell history).
      const basic = Buffer.from(`x-access-token:${token}`).toString('base64');
      await git.addConfig('http.extraHeader', `AUTHORIZATION: basic ${basic}`);
      let statusSummary = null;
      try {
        // WS-007: stage tracked modifications only (-u), never untracked
        // files (secrets, dumps, build artifacts). Report what stayed out.
        statusSummary = await git.status();
        await git.add(['-u']);
      } finally {
        await git.addConfig('http.extraHeader', '').catch(() => {});
      }
      await git.commit(message);

      await git.push('origin', branch);
      const untracked = statusSummary?.not_added?.length || 0;

      res.json({ ok: true, untrackedLeftOut: untracked });
    } catch (err) {
      next(err);
    }
  });

  // POST /workspaces/:id/upload - upload arbitrary files or entire folder tree
  // WS-015: 200 files/request max (multer uses disk storage, but 2000×50MB
  // would still allow 100GB per request).
  router.post('/:id/upload', uploadFieldArray('files', 200), async (req, res, next) => {
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
            if (isIgnoredExtractionPath(relPath.replace(/\\/g, '/'))) return null;
            const dest = safeJoin(ws.diskPath, relPath);
            await mkDir(join(dest, '..'), { recursive: true });
            await copyFile(file.path, dest);
            return relPath;
          }));
          uploadedFiles.push(...chunkResults.filter(Boolean));
        }
      }

      res.json({ ok: true, uploadedFiles });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

// Kept in sync (by content) with MASTER_IGNORE_DIRS in packages/web/src/components/pages/AIChatPage.tsx.
// This is the LAST line of defense: it runs on every extraction path, including a
// user directly uploading a raw .zip (the "ZIP Archive" option), which never goes
// through the frontend's folder-scan filtering at all.
const GLOBAL_SKIP_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build',
  'coverage', '.cache', 'vendor', 'venv', '.venv', '__pycache__',
  '.turbo', 'out', '.idea', '.vscode', 'tmp', 'temp',
  'target', '.target', '.gradle', '.cargo', '.nuget', '.output',
  'bower_components', 'jspm_packages', '.expo', '.serverless',
  '.swc', 'obj', 'bin', '.yarn', '.pnpm-store',
  '.pytest_cache', '.mypy_cache', '.ruff_cache', '.htmlcov', 'htmlcov',
  '.nox', '.tox', '.conda', '.eggs', '.nyc_output',
  'cmake-build-debug', 'cmake-build-release', 'CMakeFiles', 'ipch', '.vs',
  '.dart_tool', '.fvm', 'Pods', 'DerivedData', '.build', '.swiftpm',
  'captures', '.externalNativeBuild', 'xcuserdata',
  '.docker', '.vagrant', '.terraform', '.terragrunt-cache',
  '.elasticbeanstalk', '.npm', '.pnpm', '.nvm', '.hg', '.svn',
  '.vercel', '.firebase', '.angular', '.sass-cache', '.fleet', '.nova',
  '.history', '.parcel-cache', '.nuxt', '.astro', '.vite', '.docusaurus',
  '$RECYCLE.BIN', '.Trashes', '.AppleDouble', '.LSOverride', '.Spotlight-V100'
]);

// Junk files that should never land in a workspace, regardless of which directory
// they're in — matches MASTER_IGNORE_EXACT_FILES / MASTER_IGNORE_EXTENSIONS on the
// frontend, so a raw .zip upload gets the exact same filtering a folder upload does.
const GLOBAL_SKIP_EXACT_FILES = new Set([
  '.DS_Store', 'Thumbs.db', 'desktop.ini', 'ehthumbs.db', 'npm-debug.log',
  'yarn-debug.log', 'yarn-error.log', 'pnpm-debug.log', 'coverage.xml',
  'lcov.info', '.pnp.cjs', '.pnp.loader.mjs'
]);

const GLOBAL_SKIP_EXTENSIONS = new Set([
  'log', 'tmp', 'temp', 'bak', 'swp', 'swo',
  'pyc', 'pyo', 'pyd',
  'class', 'jar', 'war', 'ear',
  'o', 'obj', 'dll', 'so', 'dylib', 'exe', 'a', 'lib',
  'pdb', 'idb', 'ilk', 'suo', 'user'
  // Note: zip/tar/gz/rar/7z are deliberately NOT skipped server-side — the frontend
  // ignores those to avoid re-zipping archives during a folder scan, but a directly
  // uploaded ZIP full of legitimate data files (e.g. sample assets) shouldn't have
  // its own top-level files nuked based on extension alone.
]);

/** True if this path (a file OR a directory segment in it) should never be extracted. */
function isIgnoredExtractionPath(normPath) {
  const parts = normPath.split('/');
  if (parts.some(p => GLOBAL_SKIP_DIRS.has(p) || GLOBAL_SKIP_DIRS.has(p.toLowerCase()))) return true;
  const fileName = parts[parts.length - 1];
  if (!fileName) return false;
  if (GLOBAL_SKIP_EXACT_FILES.has(fileName) || GLOBAL_SKIP_EXACT_FILES.has(fileName.toLowerCase())) return true;
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex > 0) {
    const ext = fileName.substring(dotIndex + 1).toLowerCase();
    if (GLOBAL_SKIP_EXTENSIONS.has(ext)) return true;
  }
  return false;
}

/** Walk a directory tree and return relative file paths (excludes node_modules, .git, etc.). */
async function walkDir(dir, base = '', depth = 0, maxDepth = 25) {
  const files = [];
  if (depth > maxDepth) return files;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (GLOBAL_SKIP_DIRS.has(entry.name) || GLOBAL_SKIP_DIRS.has(entry.name.toLowerCase())) continue;
    // WS-009: never follow symlinks — a crafted loop (a/b -> a) must not
    // cause infinite recursion.
    if (entry.isSymbolicLink()) continue;
    const full = join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...await walkDir(full, rel, depth + 1, maxDepth));
    } else {
      if (GLOBAL_SKIP_EXACT_FILES.has(entry.name) || GLOBAL_SKIP_EXACT_FILES.has(entry.name.toLowerCase())) continue;
      const dotIndex = entry.name.lastIndexOf('.');
      if (dotIndex > 0 && GLOBAL_SKIP_EXTENSIONS.has(entry.name.substring(dotIndex + 1).toLowerCase())) continue;
      files.push({ path: rel, name: entry.name });
    }
  }
  return files;
}

/** simple-git ships `export =` typings — dynamic import callers go through
 *  this untyped factory instead of tripping checkJs on `.default`.
 *  @param {string} [cwd]
 *  @returns {Promise.<any>}
 */
async function simpleGit(cwd) {
  const mod = /** @type {any} */ (await import('simple-git'));
  const factory = mod.default || mod;
  return cwd ? factory(cwd) : factory;
}

/** Join and ensure the path stays within the workspace root (fail-closed on traversal).
 *  SEC-021: percent-decoding happens BEFORE segment checks, so %2e%2e%2f,
 *  double-encoding (%252e) and full-width slashes (%uff0f) can't smuggle `..`
 *  past the filter. Decodes repeatedly (max 3 rounds) to catch nesting.
 *  WS-001: the root itself is canonicalized with path.resolve so mixed
 *  separators can't produce a non-comparable base. */
function safeJoin(root, p) {
  const rootResolved = resolvePath(root);
  let rel = String(p || '').replace(/\\/g, '/');
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(rel).replace(/\\/g, '/').replace(/％|／|＼/g, (c) => (c === '／' || c === '＼' ? '/' : '%'));
      if (decoded === rel) break;
      rel = decoded;
    } catch {
      break;
    }
  }
  if (!rel || rel.startsWith('/') || /^[A-Za-z]:\//.test(rel)) {
    throw httpError(400, 'invalid path: absolute paths not allowed');
  }
  const parts = rel.split('/');
  const stack = [];
  for (const part of parts) {
    if (part === '' || part === '.') continue;
    if (part === '..') {
      throw httpError(400, 'invalid path: path traversal not allowed');
    }
    stack.push(part);
  }
  if (!stack.length) {
    throw httpError(400, 'invalid path');
  }
  return join(rootResolved, ...stack);
}

/** WS-010 helper: true when a tree exceeds `maxBytes` (early-abort walk). */
async function workspaceExceedsBytes(root, maxBytes) {
  const { stat } = await import('node:fs/promises');
  const stack = [root];
  let total = 0;
  let seen = 0;
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (e.isSymbolicLink()) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
      } else {
        try {
          total += (await stat(full)).size;
        } catch {
          continue;
        }
        if (total > maxBytes) return true;
        if (++seen > 100_000) return true;
      }
    }
  }
  return false;
}

/** Extract a ZIP archive to a directory using parallel 32-concurrency STREAMED disk writes.
 *  Streaming (entry.stream().pipe(writeStream)) instead of entry.buffer() avoids holding
 *  each file's full decompressed content in memory before writing it — measurably faster
 *  for projects with many/large files, and the main reason extraction used to noticeably
 *  stall after the upload bar hit 100%.
 *  WS-002: zip-bomb guards — per-file, total-output, and entry-count caps. */
const ZIP_MAX_FILE_BYTES = 50_000_000;
const ZIP_MAX_TOTAL_BYTES = 500_000_000;
const ZIP_MAX_ENTRIES = 20_000;

async function extractZipTo(zipPath, destDir) {
  const { Open } = await import('unzipper');
  const { createWriteStream } = await import('node:fs');
  const { pipeline } = await import('node:stream/promises');

  const directory = await Open.file(zipPath);
  const CONCURRENCY = 32;
  const entries = directory.files;
  if (entries.length > ZIP_MAX_ENTRIES) {
    throw httpError(413, `archive has too many entries (${entries.length} > ${ZIP_MAX_ENTRIES})`);
  }

  let totalBytes = 0;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const chunk = entries.slice(i, i + CONCURRENCY);
    await Promise.all(
      chunk.map(async (entry) => {
        const normPath = entry.path.replace(/\\/g, '/');
        if (isIgnoredExtractionPath(normPath)) return;

        const declared = Number(entry.uncompressedSize || 0);
        if (declared > ZIP_MAX_FILE_BYTES) {
          throw httpError(413, `archive entry too large: ${entry.path}`);
        }
        totalBytes += declared;
        if (totalBytes > ZIP_MAX_TOTAL_BYTES) {
          throw httpError(413, 'archive expands beyond the 500MB limit (possible zip bomb)');
        }

        const fullPath = safeJoin(destDir, entry.path);
        if (entry.type === 'Directory') {
          await mkdir(fullPath, { recursive: true });
        } else {
          await mkdir(join(fullPath, '..'), { recursive: true });
          // SEC-022: verify the PARENT resolves inside destDir BEFORE
          // streaming — a symlink inside the zip pointing outside must abort
          // the extraction, not overwrite host files.
          const { realpath, rm: rmFile } = await import('node:fs/promises');
          const realDest = await realpath(destDir).catch(() => destDir);
          const realParent = await realpath(join(fullPath, '..')).catch(() => null);
          if (!realParent || (realParent !== realDest && !realParent.startsWith(realDest + pathSep))) {
            throw httpError(413, `archive entry escapes destination (possible zip-slip/symlink): ${entry.path}`);
          }
          await pipeline(entry.stream(), createWriteStream(fullPath));
          // Post-write check: if the written file resolves outside destDir
          // (symlink swapped in mid-extraction), remove it and abort.
          const realFile = await realpath(fullPath).catch(() => null);
          if (!realFile || (realFile !== fullPath && !realFile.startsWith(realDest + pathSep))) {
            await rmFile(realFile || fullPath, { force: true }).catch(() => {});
            throw httpError(413, `archive entry escapes destination after write: ${entry.path}`);
          }
        }
      })
    );
  }
}

/** Clone a git repo to a directory with optional branch selection.
 *  @param {string} repoUrl
 *  @param {string} destDir
 *  @param {{ branch?: string, branchName?: string }} [opts]
 */
async function cloneRepo(repoUrl, destDir, opts = {}) {
  const git = await simpleGit();
  const cloneOpts = { '--depth': '1' };
  if (opts.branch && opts.branch !== 'current') {
    cloneOpts['--branch'] = opts.branchName || opts.branch;
  }
  await git().silent(true).clone(repoUrl, destDir, cloneOpts);
}
