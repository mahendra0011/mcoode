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
        const zipPath = req.file?.path || join(UPLOADS_DIR, zipFilename);
        await extractZipTo(zipPath, diskPath);
      } else if (source === 'git') {
        if (!repoUrl) {
          return res.status(400).json({ error: { code: 'VALIDATION', message: 'repoUrl required for git source' } });
        }
        gitUrl = repoUrl;
        branchResult = branch;
        await cloneRepo(repoUrl, diskPath, { branch: branchResult, branchName });
      } else if (source === 'design') {
        // Scaffold a React/Vite project from a design's generated HTML
        const { designId } = req.body;
        if (!designId) {
          return res.status(400).json({ error: { code: 'VALIDATION', message: 'designId required for design source' } });
        }
        const design = await db().design.findOne({ _id: designId, userId: req.userId });
        if (!design) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'design not found' } });
        }
        await scaffoldFromDesign(design, diskPath);
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
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      
      const git = (await import('simple-git')).default;
      const branches = await git(ws.diskPath).branchLocal();
      res.json({ branches: branches.all, current: branches.current });
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
  router.post('/:id/push', async (req, res, next) => {
    try {
      const { message, branch } = req.body;
      if (!message || !branch) return res.status(400).json({ error: { code: 'VALIDATION', message: 'message and branch required' }});
      
      const ws = await db().workspace.findOne({ _id: req.params.id, userId: req.userId });
      if (!ws) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'workspace not found' } });
      if (!ws.gitUrl) return res.status(400).json({ error: { code: 'VALIDATION', message: 'Not a git workspace' } });

      // Fetch the oauth token to construct authenticated url
      const githubAcc = await db().githubAccount.findOne({ userId: req.userId });
      if (!githubAcc) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'GitHub not connected' }});
      
      const { decrypt } = await import('../secret-enc.js');
      const token = decrypt(githubAcc.accessToken, secret);
      
      // Convert https://github.com/owner/repo.git to https://<token>@github.com/owner/repo.git
      const authUrl = ws.gitUrl.replace('https://', `https://${token}@`);

      const git = (await import('simple-git')).default(ws.diskPath);
      await git.addConfig('user.name', githubAcc.username);
      await git.addConfig('user.email', `${githubAcc.username}@users.noreply.github.com`);
      
      await git.add('.');
      await git.commit(message);
      
      // Set remote and push
      // Note: In real scenarios, you'd add this as a remote, e.g., 'origin'
      // Or just push directly to the URL
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

/** Scaffold a React/Vite project from a design's generated HTML.
 *  Splits the design HTML into index.html + src/App.jsx so the user lands
 *  in a real, editable project inside the AI Code Agent workspace. */
async function scaffoldFromDesign(design, destDir) {
  await mkdir(join(destDir, 'src'), { recursive: true });
  await mkdir(join(destDir, 'public'), { recursive: true });

  // Extract CSS and body content from the generated HTML
  const html = design.html || '';
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const css = styleMatch ? styleMatch[1] : '';
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1].trim() : '';

  // index.html
  await writeFile(
    join(destDir, 'index.html'),
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Design: ${design.prompt ? design.prompt.slice(0, 60) : 'mcode design'}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,
    'utf8'
  );

  // src/main.jsx
  await writeFile(
    join(destDir, 'src', 'main.jsx'),
    `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
    'utf8'
  );

  // src/App.jsx — port the design's body HTML into JSX
  const appContent = bodyContent
    .replace(/<!--([\s\S]*?)-->/g, '') // strip HTML comments
    .replace(/class=/g, 'className=')
    .replace(/for=/g, 'htmlFor=')
    .replace(/onclick/gi, 'onClick')
    .replace(/onmouseenter/gi, 'onMouseEnter')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  await writeFile(
    join(destDir, 'src', 'App.jsx'),
    `import React from 'react'
import './index.css'

export default function App() {
  return (
    <>
${appContent
      .split('\n')
      .map((line) => '      ' + line)
      .join('\n')}
    </>
  )
}
`,
    'utf8'
  );

  // src/index.css — extracted styles + Tailwind import
  await writeFile(
    join(destDir, 'src', 'index.css'),
    `@tailwind base;
@tailwind components;
@tailwind utilities;

${css}
`,
    'utf8'
  );

  // package.json
  await writeFile(
    join(destDir, 'package.json'),
    JSON.stringify(
      {
        name: `design-${String(design._id || 'app').slice(-8)}`,
        version: '0.1.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18.3.0',
          'react-dom': '^18.3.0',
        },
        devDependencies: {
          '@vitejs/plugin-react': '^4.3.0',
          vite: '^5.3.0',
        },
      },
      null,
      2
    ),
    'utf8'
  );

  // vite.config.js
  await writeFile(
    join(destDir, 'vite.config.js'),
    `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
`,
    'utf8'
  );
}
