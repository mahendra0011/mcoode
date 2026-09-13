const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const ROOT_EXTENSIONS_DIR = path.resolve('d:/projects/mcoode/extensions');

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
  'bito',
  'cline',
  'roocode',
];

function isAiExtension(item) {
  const text = `${item.namespace} ${item.name} ${item.displayName || ''} ${item.description || ''}`.toLowerCase();
  return AI_BLACKLIST_TERMS.some((term) => text.includes(term));
}

function isCompilerOrLangPack(item) {
  const text = `${item.namespace} ${item.name} ${item.displayName || ''} ${item.description || ''}`.toLowerCase();
  const id = `${item.namespace}.${item.name}`.toLowerCase();
  if (text.includes('language pack') || text.includes('language-pack')) return true;
  if (id === 'golang.go' || id === 'ms-python.python' || id === 'ms-vscode.cpptools' || id === 'ms-vscode.c_cpp_tools') return true;
  if (text.startsWith('rich go language support') || text.startsWith('python language support')) return true;
  return false;
}

const CATEGORY_SEARCHES = [
  {
    category: 'linters',
    url: 'https://open-vsx.org/api/-/search?category=Linters&size=40&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'formatters',
    url: 'https://open-vsx.org/api/-/search?category=Formatters&size=40&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'themes',
    url: 'https://open-vsx.org/api/-/search?category=Themes&size=40&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'snippets',
    url: 'https://open-vsx.org/api/-/search?category=Snippets&size=40&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'productivity',
    url: 'https://open-vsx.org/api/-/search?category=Other&size=40&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'git',
    url: 'https://open-vsx.org/api/-/search?category=SCM%20Providers&size=40&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'databases',
    url: 'https://open-vsx.org/api/-/search?query=database&size=30&sortBy=downloadCount&sortOrder=desc',
  },
  {
    category: 'tools',
    url: 'https://open-vsx.org/api/-/search?category=Debuggers&size=30&sortBy=downloadCount&sortOrder=desc',
  },
];

async function downloadAndUnpackExtension(ext, categoryDir) {
  const extId = `${ext.namespace}.${ext.name}`;
  const extTargetDir = path.join(categoryDir, extId);

  // If already downloaded and has package.json, skip to save bandwidth
  if (fs.existsSync(path.join(extTargetDir, 'package.json'))) {
    console.log(`[ALREADY DOWNLOADED] ${extId}`);
    return true;
  }

  const downloadUrl = ext.files?.download;
  if (!downloadUrl) {
    console.log(`[NO DOWNLOAD URL] ${extId}`);
    return false;
  }

  try {
    console.log(`[DOWNLOADING] ${extId} from ${downloadUrl.slice(0, 65)}...`);
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      console.warn(`[FAILED HTTP] ${extId}: status ${res.status}`);
      return false;
    }

    const buffer = await res.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    fs.mkdirSync(extTargetDir, { recursive: true });

    let extractedCount = 0;
    for (const [filename, fileObj] of Object.entries(zip.files)) {
      if (fileObj.dir || !filename.startsWith('extension/')) continue;

      const relPath = filename.replace(/^extension\//, '');
      const outPath = path.join(extTargetDir, relPath);

      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      const content = await fileObj.async('nodebuffer');
      fs.writeFileSync(outPath, content);
      extractedCount++;
    }

    console.log(`[SUCCESS] Extracted ${extractedCount} files for ${extId}`);
    return true;
  } catch (err) {
    console.error(`[ERROR] ${extId}:`, err.message);
    return false;
  }
}

async function run() {
  console.log('=== STARTING BULK EXTENSIONS DOWNLOAD & EXTRACTION ===');
  console.log(`Target directory: ${ROOT_EXTENSIONS_DIR}\n`);

  fs.mkdirSync(ROOT_EXTENSIONS_DIR, { recursive: true });

  const masterManifest = {};
  let totalDownloaded = 0;

  for (const { category, url } of CATEGORY_SEARCHES) {
    const categoryDir = path.join(ROOT_EXTENSIONS_DIR, category);
    fs.mkdirSync(categoryDir, { recursive: true });

    console.log(`\n========================================`);
    console.log(`CATEGORY: [${category.toUpperCase()}]`);
    console.log(`========================================`);

    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const list = data.extensions || [];

      const categoryManifest = [];

      for (const item of list) {
        if (isAiExtension(item)) {
          console.log(`[SKIP AI] ${item.namespace}.${item.name}`);
          continue;
        }
        if (isCompilerOrLangPack(item)) {
          console.log(`[SKIP COMPILER] ${item.namespace}.${item.name}`);
          continue;
        }
        if (!item.description || item.description.length < 10) {
          continue;
        }

        const ok = await downloadAndUnpackExtension(item, categoryDir);
        if (ok) {
          totalDownloaded++;
          categoryManifest.push({
            id: `${item.namespace}.${item.name}`,
            name: item.displayName || item.name,
            publisher: item.namespace,
            version: item.version,
            description: item.description,
            localPath: path.relative(ROOT_EXTENSIONS_DIR, path.join(categoryDir, `${item.namespace}.${item.name}`)),
          });
        }

        // Brief delay between downloads
        await new Promise((r) => setTimeout(r, 150));
      }

      fs.writeFileSync(
        path.join(categoryDir, 'index.json'),
        JSON.stringify(categoryManifest, null, 2),
        'utf-8'
      );
      masterManifest[category] = categoryManifest;
    } catch (e) {
      console.error(`Error processing category ${category}:`, e.message);
    }
  }

  fs.writeFileSync(
    path.join(ROOT_EXTENSIONS_DIR, 'extensions.json'),
    JSON.stringify(masterManifest, null, 2),
    'utf-8'
  );

  console.log('\n========================================');
  console.log(`FINISHED: Downloaded & Unpacked ${totalDownloaded} real extensions!`);
  console.log(`Manifest created at: ${path.join(ROOT_EXTENSIONS_DIR, 'extensions.json')}`);
  console.log('========================================');
}

run();
