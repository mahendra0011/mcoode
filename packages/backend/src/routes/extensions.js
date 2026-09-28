import { Router } from 'express';
import { authMiddleware } from '../auth.js';
import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import unzipper from 'unzipper';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root directory for runtime-installed extensions
const DATA_DIR = path.resolve(__dirname, '../../data');
const INSTALLED_DIR = path.join(DATA_DIR, 'installed-extensions');
const REGISTRY_FILE = path.join(INSTALLED_DIR, 'registry.json');

// Ensure directory exists
if (!fs.existsSync(INSTALLED_DIR)) {
  fs.mkdirSync(INSTALLED_DIR, { recursive: true });
}

// Ensure registry.json exists
if (!fs.existsSync(REGISTRY_FILE)) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf-8');
}

const OPEN_VSX_API = 'https://open-vsx.org/api';

const AI_BLACKLIST_TERMS = [
  'claude',
  'qwen',
  'copilot',
  'chatgpt',
  'gpt-',
  'openai',
  'tabnine',
  'codeium',
  'cursor',
  'continue.dev',
  'supermaven',
  'codegeex',
  'deepseek',
  'fitten',
  'marscode',
  'gemini',
  'ai assistant',
  'ai chat',
  'prompt assistant',
  'generative ai',
  'cody',
];

function isAiExtension(ext) {
  const text = `${ext.namespace || ''} ${ext.name || ''} ${ext.displayName || ''} ${ext.description || ''}`.toLowerCase();
  return AI_BLACKLIST_TERMS.some((term) => text.includes(term));
}

function parseJsonc(rawText) {
  if (!rawText || typeof rawText !== 'string') return {};
  try {
    // Strip single line comments
    let cleaned = rawText.replace(/\/\/.*$/gm, '');
    // Strip multi-line comments
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    // Strip trailing commas before closing braces or brackets
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(cleaned);
  } catch (err) {
    try {
      return JSON.parse(rawText);
    } catch {
      return {};
    }
  }
}

function readRegistry() {
  try {
    if (!fs.existsSync(REGISTRY_FILE)) return [];
    const content = fs.readFileSync(REGISTRY_FILE, 'utf-8');
    return JSON.parse(content) || [];
  } catch (err) {
    console.error('[extensions] Failed to read registry:', err.message);
    return [];
  }
}

function saveRegistry(list) {
  try {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.error('[extensions] Failed to save registry:', err.message);
  }
}

// EXT-003: serialize registry read-modify-write so concurrent installs can't
// clobber each other's entries (last-writer-wins on a stale read).
let registryChain = Promise.resolve();
function updateRegistry(mutator) {
  const run = registryChain.then(() => {
    const list = readRegistry();
    const next = mutator(list) || list;
    saveRegistry(next);
    return next;
  });
  registryChain = run.catch(() => {});
  return run;
}

/**
 * Converts VS Code theme JSON into Monaco Editor defineTheme format
 */
function convertToMonacoTheme(themeData, uiTheme) {
  const isDark = uiTheme === 'vs-dark' || (themeData.type && themeData.type.toLowerCase().includes('dark')) || true;
  const isHc = uiTheme === 'hc-black';
  const base = isHc ? 'hc-black' : isDark ? 'vs-dark' : 'vs';

  const rules = [];
  const tokenColors = themeData.tokenColors || [];

  for (const tc of tokenColors) {
    const scopes = Array.isArray(tc.scope) ? tc.scope : [tc.scope];
    const settings = tc.settings || {};
    const fg = settings.foreground ? settings.foreground.replace(/^#/, '') : undefined;
    const fontStyle = settings.fontStyle;

    for (const scope of scopes) {
      if (typeof scope === 'string' && scope.trim()) {
        rules.push({
          token: scope.trim(),
          foreground: fg,
          fontStyle: fontStyle || undefined,
        });
      }
    }
  }

  return {
    base,
    inherit: true,
    rules,
    colors: themeData.colors || {},
  };
}

/** @param {{ secret?: string }} [opts] */
export function extensionRoutes({ secret } = {}) {
  const router = Router();
  if (secret) router.use(authMiddleware({ secret }));

  // GET /api/v1/extensions/search?q=eslint&category=...
  router.get('/search', async (req, res, next) => {
    try {
      const { q = '', category, size = 50 } = req.query;
      const params = { query: q, size };
      if (category && category !== 'All categories') {
        params.category = category;
      }

      const { data } = await axios.get(`${OPEN_VSX_API}/-/search`, {
        params,
        timeout: 10000,
      });

      const installedList = readRegistry();
      const installedMap = new Set(installedList.map((e) => e.id));

      const extensions = (data.extensions || [])
        .filter((ext) => !isAiExtension(ext))
        .map((ext) => {
          const id = `${ext.namespace}.${ext.name}`;
          return {
            id,
            name: ext.displayName || ext.name,
            publisher: ext.namespace,
            description: ext.description,
            version: ext.version,
            downloads: ext.downloadCount,
            rating: ext.averageRating,
            icon: ext.files?.icon || '⚡',
            downloadUrl: ext.files?.download,
            isInstalled: installedMap.has(id),
          };
        });

      res.json({ extensions });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/extensions/installed
  router.get('/installed', (req, res) => {
    const list = readRegistry();
    res.json({ extensions: list });
  });

  // POST /api/v1/extensions/install
  // Body: { id, version?, downloadUrl? }
  router.post('/install', async (req, res, next) => {
    try {
      const { id, version, downloadUrl } = req.body;
      if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+$/.test(id)) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'Extension id is required (e.g. "publisher.name")' } });
      }
      if (downloadUrl !== undefined) {
        try {
          const u = new URL(String(downloadUrl));
          const host = u.hostname.toLowerCase();
          if (host !== 'open-vsx.org' && host !== 'openvsx.org') {
            return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'downloadUrl must be an Open VSX URL' } });
          }
        } catch {
          return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'invalid downloadUrl' } });
        }
      }

      const parts = id.split('.');
      if (parts.length < 2) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid extension ID format. Expected "namespace.name"' } });
      }

      const [publisher, name] = parts;
      console.log(`[extensions] Installing extension: ${id}...`);

      // 1. Determine download URL
      let targetDownloadUrl = downloadUrl;
      let targetVersion = version;
      let extInfo = null;

      if (!targetDownloadUrl) {
        // Fetch metadata from Open VSX
        const metaRes = await axios.get(`${OPEN_VSX_API}/${publisher}/${name}`, { timeout: 10000 });
        extInfo = metaRes.data;
        targetVersion = targetVersion || extInfo.version;
        targetDownloadUrl = extInfo.files?.download;
      }

      if (!targetDownloadUrl) {
        // Fallback standard Open VSX CDN link pattern
        targetDownloadUrl = `${OPEN_VSX_API}/${publisher}/${name}/${targetVersion}/file/${publisher}.${name}-${targetVersion}.vsix`;
      }

      console.log(`[extensions] Downloading from: ${targetDownloadUrl}`);

      // 2. Download .vsix binary
      // EXT-004: bound download size (100MB) — arraybuffer holds it in RAM.
      const headLength = await axios.head(targetDownloadUrl, { timeout: 10000 }).then(
        (r) => Number(r.headers?.['content-length'] || 0),
        () => 0
      );
      if (headLength > 100_000_000) {
        return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Extension package exceeds the 100MB download limit' } });
      }
      const downloadResponse = await axios.get(targetDownloadUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 100_000_000,
        maxBodyLength: 100_000_000,
      });

      const buffer = Buffer.from(downloadResponse.data);

      // 3. Extract via unzipper
      const directory = await unzipper.Open.buffer(buffer);
      const extTargetDir = path.join(INSTALLED_DIR, id);

      // Clean old directory if exists
      const { rm, mkdir, writeFile, readFile } = await import('node:fs/promises');
      if (fs.existsSync(extTargetDir)) {
        await rm(extTargetDir, { recursive: true, force: true });
      }
      await mkdir(extTargetDir, { recursive: true });

      // EXT-002: async writes — a 500-file extension must not block the loop.
      for (const file of directory.files) {
        if (file.type === 'Directory' || !file.path.startsWith('extension/')) continue;
        const relPath = file.path.replace(/^extension\//, '');
        // Guard against directory traversal
        const resolvedPath = path.resolve(extTargetDir, relPath);
        if (!resolvedPath.startsWith(extTargetDir + path.sep) && resolvedPath !== extTargetDir) continue;

        await mkdir(path.dirname(resolvedPath), { recursive: true });
        const fileContent = await file.buffer();
        await writeFile(resolvedPath, fileContent);
      }

      // 4. Parse extension package.json
      const pkgJsonPath = path.join(extTargetDir, 'package.json');
      let pkg = {};
      if (fs.existsSync(pkgJsonPath)) {
        pkg = parseJsonc(await readFile(pkgJsonPath, 'utf-8'));
      }

      const contributes = pkg.contributes || {};
      const parsedThemes = [];
      const parsedSnippets = [];

      // Extract themes
      if (Array.isArray(contributes.themes)) {
        for (const themeItem of contributes.themes) {
          const themeRelPath = themeItem.path;
          if (themeRelPath) {
            const themeFullPath = path.resolve(extTargetDir, themeRelPath);
            if (fs.existsSync(themeFullPath) && (themeFullPath.startsWith(extTargetDir + path.sep) || themeFullPath === extTargetDir)) {
              const rawTheme = parseJsonc(await readFile(themeFullPath, 'utf-8'));
              const monacoTheme = convertToMonacoTheme(rawTheme, themeItem.uiTheme);
              parsedThemes.push({
                id: themeItem.id || themeItem.label || `${id}-theme`,
                label: themeItem.label || themeItem.id || 'Custom Theme',
                uiTheme: themeItem.uiTheme || 'vs-dark',
                themeData: monacoTheme,
              });
            }
          }
        }
      }

      // Extract snippets
      if (Array.isArray(contributes.snippets)) {
        for (const snippetItem of contributes.snippets) {
          const snippetRelPath = snippetItem.path;
          const language = snippetItem.language;
          if (snippetRelPath && language) {
            const snippetFullPath = path.resolve(extTargetDir, snippetRelPath);
            if (fs.existsSync(snippetFullPath) && (snippetFullPath.startsWith(extTargetDir + path.sep) || snippetFullPath === extTargetDir)) {
              const rawSnippets = parseJsonc(await readFile(snippetFullPath, 'utf-8'));
              const snippetList = [];
              for (const [sName, sData] of Object.entries(rawSnippets)) {
                if (sData && (sData.prefix || sData.body)) {
                  const body = Array.isArray(sData.body) ? sData.body.join('\n') : (sData.body || '');
                  snippetList.push({
                    name: sName,
                    label: sData.prefix || sName,
                    insertText: body,
                    detail: sData.description || sName,
                    documentation: sData.description || sName,
                  });
                }
              }
              if (snippetList.length > 0) {
                parsedSnippets.push({
                  language,
                  snippets: snippetList,
                });
              }
            }
          }
        }
      }

      // 5. Update Registry
      const installedExtension = {
        id,
        name: pkg.displayName || pkg.name || name,
        publisher: pkg.publisher || publisher,
        version: pkg.version || targetVersion || '1.0.0',
        description: pkg.description || '',
        icon: pkg.icon ? `/api/v1/extensions/${id}/icon` : '⚡',
        installedAt: new Date().toISOString(),
        contributes: {
          themes: parsedThemes,
          snippets: parsedSnippets,
          commands: contributes.commands || [],
        },
      };

      await updateRegistry((registry) => {
        const next = registry.filter((e) => e.id !== id);
        next.push(installedExtension);
        return next;
      });

      console.log(`[extensions] Successfully installed ${id}! Found ${parsedThemes.length} themes, ${parsedSnippets.length} snippet packs.`);

      res.json({
        ok: true,
        message: `Extension "${installedExtension.name}" installed successfully`,
        extension: installedExtension,
      });
    } catch (err) {
      console.error('[extensions] Install error:', err);
      res.status(500).json({ error: { code: 'INSTALL_FAILED', message: `Failed to install extension: ${err.message}` } });
    }
  });

  // DELETE /api/v1/extensions/uninstall/:id
  router.delete('/uninstall/:id', async (req, res) => {
    try {
      const { id } = req.params;
      if (!id || typeof id !== 'string' || !/^[A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+$/.test(id)) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid extension ID format' } });
      }
      const extTargetDir = path.join(INSTALLED_DIR, id);
      // EXT-005: verify the resolved target dir is inside INSTALLED_DIR
      const resolvedTarget = path.resolve(extTargetDir);
      const installedRoot = path.resolve(INSTALLED_DIR);
      if (!resolvedTarget.startsWith(installedRoot + path.sep) && resolvedTarget !== installedRoot) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'Invalid extension ID' } });
      }

      if (fs.existsSync(extTargetDir)) {
        // FINDING-1047: retry on EBUSY/EPERM (Windows file locks)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            fs.rmSync(extTargetDir, { recursive: true, force: true });
            break;
          } catch (rmErr) {
            if ((rmErr.code === 'EBUSY' || rmErr.code === 'EPERM') && attempt < 2) {
              await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
            } else {
              throw rmErr;
            }
          }
        }
      }

      await updateRegistry((registry) => registry.filter((e) => e.id !== id));

      console.log(`[extensions] Uninstalled extension: ${id}`);
      res.json({ ok: true, id, message: `Extension ${id} uninstalled successfully` });
    } catch (err) {
      console.error('[extensions] Uninstall error:', err);
      res.status(500).json({ error: { code: 'UNINSTALL_FAILED', message: `Failed to uninstall extension: ${err.message}` } });
    }
  });

  return router;
}
