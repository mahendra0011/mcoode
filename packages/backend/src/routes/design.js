import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware } from '../auth.js';

const DESIGN_SYSTEM_PROMPT = `You are mcode's UI designer. Output a single self-contained HTML file with inline <style> tags (Tailwind CDN via https://cdn.tailwindcss.com is allowed). The page should be responsive, use a dark or emerald/blue color scheme matching the mcode aesthetic. Output ONLY the HTML code — no explanations, no markdown fences, no commentary. The HTML must be valid and render correctly in an iframe.`;

export function designRoutes({ secret }) {
  const r = Router();
  r.use(authMiddleware({ secret }));

  // POST /api/v1/design/generate
  // Body: { prompt, baseTemplate, designId, device }
  // Uses ModelRouter from CLI for generation. Streams via socket 'design:stream' / 'design:done'.
  r.post('/generate', async (req, res, next) => {
    try {
      const { prompt, baseTemplate = null, designId = null, device = 'desktop' } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: { code: 'VALIDATION', message: 'prompt is required' } });
      }

      const userId = req.userId;

      // Load or create design
      let design;
      let version = 1;
      let parentId = null;
      let prevHtml = '';

      if (designId) {
        // Refinement — fetch previous version
        const existing = await db().design.findOne({ _id: designId, userId });
        if (!existing) {
          return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'design not found' } });
        }
        design = existing;
        version = (existing.version || 1) + 1;
        parentId = existing._id;
        prevHtml = existing.html || '';
      } else {
        // New design
        design = await db().design.create({
          userId,
          prompt,
          html: '',
          version: 1,
          parentId: null,
          device,
          createdAt: new Date()
        });
      }

      // Build messages for the model
      const messages = [
        { role: 'system', content: DESIGN_SYSTEM_PROMPT },
      ];

      if (prevHtml) {
        messages.push({ role: 'system', content: `Here is the current design's HTML:\n${prevHtml}` });
      }
      messages.push({
        role: 'user',
        content: baseTemplate
          ? `${baseTemplate}\n\nRefinement request: ${prompt}`
          : `Build request: ${prompt}\n\nDevice: ${device}. Make sure the layout is responsive and looks great.`
      });

      // Use ModelRouter to pick a model and stream
      // Try to dynamically import the CLI's provider system
      let provider = null;
      let model = null;
      let useMock = false;

      try {
        const { getProviders } = await import('mcode-cli/providers');
        const { ModelRouter } = await import('mcode-cli/router');
        const { CostLedger } = await import('@mcode/shared');
        const { deriveMasterKey, decryptKey } = await import('../secret-enc.js');

        const keys = await db().apiKey.find({ userId });
        const masterKey = deriveMasterKey(secret, userId);
        const secrets = {};
        for (const k of keys) {
          try { secrets[k.envVar] = decryptKey(k.encryptedKey, masterKey); } catch { /* skip */ }
        }

        if (Object.keys(secrets).length > 0) {
          const providers = await getProviders({ secrets });
          const router = new ModelRouter({ secrets, config: {}, ledger: new CostLedger(), providers });
          const assignment = await router.pick('build');
          if (assignment && typeof assignment.provider.stream === 'function') {
            provider = assignment.provider;
            model = assignment.model;
          } else {
            useMock = true;
          }
        } else {
          useMock = true;
        }
      } catch (e) {
        console.warn('[design] CLI provider import failed, falling back to mock:', e.message);
        useMock = true;
      }

      if (useMock) {
        // Fallback: generate a simple responsive HTML template
        provider = {
          complete: async () => {
            const html = await generateMockHtml(prompt, baseTemplate, prevHtml, device);
            return { text: html, usage: { inputTokens: 10, outputTokens: 200 } };
          },
          stream: async function* () {
            const html = await generateMockHtml(prompt, baseTemplate, prevHtml, device);
            // Emit in chunks for streaming feel
            const chunks = html.split('\n');
            for (const chunk of chunks) {
              yield chunk + '\n';
            }
          }
        };
        model = { id: 'mock-design', name: 'Mock Designer' };
      }

      // Stream generation
      const stream = provider.stream(model.id, { messages, temperature: 0.3 });

      let fullHtml = '';
      for await (const chunk of stream) {
        fullHtml += chunk;
        // Emit partial HTML to any listening socket for this user
        // (In production, we'd target a specific socket room; for now, emit generically)
        if (globalThis.__mcodeIo) {
          globalThis.__mcodeIo
            .to(`user:${userId}`)
            .emit('design:stream', { designId: design._id, htmlChunk: chunk, version });
        }
      }

      // Save the generated HTML
      await db().design.updateOne(
        { _id: design._id },
        { html: fullHtml, version, parentId, device, updatedAt: new Date() }
      );
      design = await db().design.findOne({ _id: design._id });

      if (globalThis.__mcodeIo) {
        globalThis.__mcodeIo
          .to(`user:${userId}`)
          .emit('design:done', { designId: design._id, html: fullHtml, version, parentId });
      }

      res.json({ ok: true, design });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/design — list user's designs (latest version of each)
  r.get('/', async (req, res, next) => {
    try {
      const designs = await db().design.find({ userId: req.userId });

      // Group by root design (latest version of each chain)
      const byPrompt = {};
      for (const d of designs) {
        const key = d.parentId || d._id;
        if (!byPrompt[key] || (d.version || 1) > (byPrompt[key].version || 1)) {
          byPrompt[key] = d;
        }
      }
      const latest = Object.values(byPrompt).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      res.json({ designs: latest });
    } catch (err) {
      next(err);
    }
  });

  // GET /api/v1/design/:id — fetch a design (with version chain)
  r.get('/:id', async (req, res, next) => {
    try {
      const design = await db().design.findOne({ _id: req.params.id, userId: req.userId });
      if (!design) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'design not found' } });

      // Fetch version chain
      const versions = [];
      let current = design;
      versions.unshift({ _id: current._id, version: current.version, prompt: current.prompt, createdAt: current.createdAt });
      while (current.parentId) {
        current = await db().design.findOne({ _id: current.parentId, userId: req.userId });
        if (!current) break;
        versions.unshift({ _id: current._id, version: current.version, prompt: current.prompt, createdAt: current.createdAt });
      }

      res.json({ design, versions });
    } catch (err) {
      next(err);
    }
  });

  // DELETE /api/v1/design/:id — delete a design and its version chain
  r.delete('/:id', async (req, res, next) => {
    try {
      const design = await db().design.findOne({ _id: req.params.id, userId: req.userId });
      if (!design) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'design not found' } });

      // Delete this design and all versions in its chain
      const deleteChain = async (d) => {
        const children = await db().design.find({ parentId: d._id, userId: req.userId });
        for (const child of children) await deleteChain(child);
        await db().design.deleteOne({ _id: d._id });
      };
      await deleteChain(design);

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  return r;
}

/** Generate a mock HTML design when no API keys are configured. */
async function generateMockHtml(prompt, baseTemplate, prevHtml, device) {
  let title = 'My Design';
  let sections = '';
  let template = baseTemplate || '';

  const p = String(prompt || '').toLowerCase();
  const isNew = !prevHtml;

  if (isNew) {
    if (p.includes('landing') || p.includes('saas') || p.includes('pricing')) {
      title = 'SaaS Landing';
      sections = `
  <section class="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0e0e0e] to-[#0a0a0a] flex items-center justify-center p-8">
    <div class="max-w-4xl mx-auto text-center">
      <nav class="flex justify-between items-center mb-12">
        <div class="text-xl font-bold text-white">Codient</div>
        <div class="flex gap-6">
          <a href="#" class="text-white/70 hover:text-white transition">Features</a>
          <a href="#" class="text-white/70 hover:text-white transition">Pricing</a>
          <a href="#" class="text-white/70 hover:text-white transition">Contact</a>
        </div>
      </nav>
      <h1 class="text-5xl font-bold text-white mb-6">${p.includes('ai') ? 'Build with AI' : 'Build Better'}</h1>
      <p class="text-xl text-white/50 mb-8 max-w-2xl mx-auto">${p.includes('dashboard') ? 'A powerful dashboard to manage your workflow' : 'A modern landing page for your product'}</p>
      <div class="flex gap-4 justify-center mb-16">
        <button class="bg-gradient-to-r from-emerald-500 to-teal-400 text-black px-6 py-3 rounded-lg font-medium hover:opacity-90 transition">Get Started</button>
        <button class="border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/5 transition">Learn More</button>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        <div class="bg-[#151515] border border-white/5 rounded-xl p-6 text-left">
          <h3 class="text-white font-bold mb-2">Fast</h3>
          <p class="text-white/50 text-sm">Build faster with AI assistance</p>
        </div>
        <div class="bg-[#151515] border border-white/5 rounded-xl p-6 text-left">
          <h3 class="text-white font-bold mb-2">Smart</h3>
          <p class="text-white/50 text-sm">Intelligent code generation</p>
        </div>
        <div class="bg-[#151515] border border-white/5 rounded-xl p-6 text-left">
          <h3 class="text-white font-bold mb-2">Reliable</h3>
          <p class="text-white/50 text-sm">Production-ready output</p>
        </div>
      </div>
    </div>
  </section>`;
    } else if (p.includes('dashboard') || p.includes('admin')) {
      title = 'Dashboard';
      sections = `
  <section class="min-h-screen bg-[#0a0a0a] p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <div class="text-white/50 text-sm">Last updated: Today</div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-[#151515] border border-white/5 rounded-xl p-4">
          <div class="text-white/50 text-xs mb-1">Total Projects</div>
          <div class="text-2xl font-bold text-white">12</div>
        </div>
        <div class="bg-[#151515] border border-white/5 rounded-xl p-4">
          <div class="text-white/50 text-xs mb-1">Active Agents</div>
          <div class="text-2xl font-bold text-emerald-400">8</div>
        </div>
        <div class="bg-[#151515] border border-white/5 rounded-xl p-4">
          <div class="text-white/50 text-xs mb-1">This Week</div>
          <div class="text-2xl font-bold text-blue-400">156</div>
        </div>
        <div class="bg-[#151515] border border-white/5 rounded-xl p-4">
          <div class="text-white/50 text-xs mb-1">Success Rate</div>
          <div class="text-2xl font-bold text-white">97%</div>
        </div>
      </div>
      <div class="bg-[#151515] border border-white/5 rounded-xl p-4">
        <div class="text-white/50 text-xs mb-2 uppercase tracking-wider">Recent Activity</div>
        <div class="space-y-2">
          <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5">
            <div class="w-2 h-2 bg-emerald-400 rounded-full"></div>
            <span class="text-sm text-white">Build completed successfully</span>
            <span class="text-xs text-white/30 ml-auto">2 min ago</span>
          </div>
        </div>
      </div>
    </div>
  </section>`;
    } else if (p.includes('e-commerce') || p.includes('shop') || p.includes('store')) {
      title = 'E-Commerce';
      sections = `
  <section class="min-h-screen bg-[#0a0a0a] p-8">
    <div class="max-w-7xl mx-auto">
      <div class="flex justify-between items-center mb-8">
        <h1 class="text-2xl font-bold text-white">Products</h1>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="bg-[#151515] border border-white/5 rounded-xl overflow-hidden">
          <div class="h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
            <span class="text-white/50">Product Image</span>
          </div>
          <div class="p-4">
            <h3 class="text-white font-bold mb-1">Premium Plan</h3>
            <p class="text-white/50 text-sm mb-2">Full access to all features</p>
            <div class="text-xl font-bold text-emerald-400">$99/year</div>
          </div>
        </div>
      </div>
    </div>
  </section>`;
    } else {
      // Generic
      title = p.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Design';
      sections = `
  <section class="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0e0e0e] to-[#0a0a0a] flex items-center justify-center p-8">
    <div class="max-w-3xl mx-auto text-center">
      <h1 class="text-4xl font-bold text-white mb-4">${title}</h1>
      <p class="text-lg text-white/50 mb-8">${prompt}</p>
      <div class="flex gap-4 justify-center">
        <button class="bg-gradient-to-r from-emerald-500 to-teal-400 text-black px-6 py-3 rounded-lg font-medium hover:opacity-90 transition">Get Started</button>
      </div>
    </div>
  </section>`;
    }
  } else {
    // Refinement: return a slightly modified version of the previous HTML
    sections = prevHtml || '';
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    html, body { margin: 0; padding: 0; background: #0a0a0a; color: #f4f4f5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }
    * { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
    *::-webkit-scrollbar { width: 6px; height: 6px; }
    *::-webkit-scrollbar-track { background: transparent; }
    *::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    *::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
    body { overflow-x: hidden; }
  </style>
</head>
<body>
${sections}
</body>
</html>`;
}
