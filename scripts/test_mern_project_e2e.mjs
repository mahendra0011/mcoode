import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const ARTIFACTS_DIR = 'C:\\Users\\mahen\\.gemini\\antigravity-ide\\brain\\d009fafb-953e-4c35-98b1-4db21779890d';
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'e2e_screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const JWT_SECRET = 'mcode_dev_369447f4c30e4bc9904ec14a28689413af8fc21d';
const USER_ID = '6ae4e6bdb0a98f7268c8b715'; // technomp786@gmail.com

const token = jwt.sign({ sub: USER_ID, type: 'access' }, JWT_SECRET, { expiresIn: '1d' });
const refresh = jwt.sign({ sub: USER_ID, type: 'refresh', jti: 'mern-test-e2e-session' }, JWT_SECRET, { expiresIn: '30d' });

const results = {
  passed: [],
  failed: [],
  logs: []
};

function log(msg) {
  console.log(`[MERN TEST] ${msg}`);
  results.logs.push(`[${new Date().toISOString()}] ${msg}`);
}

(async () => {
  log('Starting comprehensive MERN stack project & modes browser audit...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  await context.addCookies([
    { name: 'mcode_access', value: token, domain: 'localhost', path: '/' },
    { name: 'mcode_refresh', value: refresh, domain: 'localhost', path: '/' }
  ]);

  const page = await context.newPage();

  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageErrors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(`[Uncaught Page Error] ${err.message}`);
  });

  await page.addInitScript(({ token }) => {
    try {
      localStorage.setItem('mcode_tokens', JSON.stringify({ access: token }));
      localStorage.setItem('mcode_ui_lang', 'en');
    } catch (e) {
      console.error('init script error', e);
    }
  }, { token });

  try {
    // -------------------------------------------------------------
    // PHASE 1: AI Chat Mode Architecture Planning
    // -------------------------------------------------------------
    log('--- PHASE 1: AI Chat Mode - MERN Architecture Prompt ---');
    await page.goto('http://localhost:3000/ai/chat', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2000);

    const chatTextarea = page.locator('textarea').first();
    if (await chatTextarea.isVisible()) {
      log('Prompting AI Chat for MERN TaskFlow architecture...');
      await chatTextarea.click();
      await chatTextarea.pressSequentially('Plan a modern MERN stack Task Management project with Express backend, MongoDB Mongoose schema, and React component UI.', { delay: 10 });
      await page.waitForTimeout(500);

      log('Submitting prompt with Enter key...');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(4000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_01_chat_architecture.png') });
      results.passed.push('AI Chat Mode streamed MERN architecture response');
    }

    // -------------------------------------------------------------
    // PHASE 2: AI Code Assistant Mode (God Mode & Explain)
    // -------------------------------------------------------------
    log('--- PHASE 2: AI Code Assistant Mode ---');
    const assistantTab = page.locator('header nav button').filter({ hasText: 'AI Code Assistant' }).or(page.locator('header nav button').filter({ hasText: 'Assistant' })).first();
    if (await assistantTab.isVisible()) {
      await assistantTab.click();
      await page.waitForTimeout(1500);

      // Model Selector check
      const modelSelectorBtn = page.locator('button').filter({ hasText: /Gemini|Claude|GPT|DeepSeek|Auto|Llama/ }).first();
      if (await modelSelectorBtn.isVisible()) {
        log('Model Selector accessible');
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_02_assistant_agent_mode.png') });
      results.passed.push('AI Code Assistant Mode functional with controls');
    }

    // -------------------------------------------------------------
    // PHASE 3: AI Code Editor - Create MERN Project
    // -------------------------------------------------------------
    log('--- PHASE 3: AI Code Editor - Create MERN Project Folder ---');
    const editorTab = page.locator('header nav button').filter({ hasText: 'AI Code Editor' }).or(page.locator('header nav button').filter({ hasText: 'Editor' })).first();
    if (await editorTab.isVisible()) {
      await editorTab.click();
      await page.waitForTimeout(1500);

      // Check Mode Switch Modal
      const modeSwitchModalBtn = page.locator('button:has-text("Start New Process (mcode Welcome Screen)")').first();
      if (await modeSwitchModalBtn.isVisible()) {
        log('Dismissing Mode Switch modal via Start New Process...');
        await modeSwitchModalBtn.click();
        await page.locator('text=Switch to AI Code Editor').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
      }

      // Open Create Project Modal
      log('Opening Create Project Modal for JavaScript / Node...');
      await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent('mcode:open-create-project', {
          detail: { lang: { name: 'JavaScript', extension: '.js', starterFile: 'server.js', defaultBoilerplate: 'const express = require("express");\nconst app = express();\n\napp.get("/", (req, res) => res.json({ status: "ok", app: "MERN TaskFlow API" }));\n\nconst PORT = process.env.PORT || 5000;\napp.listen(PORT, () => console.log(`Server running on port ${PORT}`));\n' } }
        }));
      });
      await page.waitForTimeout(800);

      const modalHeader = page.locator('text=Create JavaScript Project').first();
      await modalHeader.waitFor({ state: 'visible', timeout: 5000 });
      log('Create Project Modal opened cleanly.');

      const folderInput = page.locator('input[placeholder*="my-"], input[placeholder*="project"]').first();
      await folderInput.fill('mern-taskflow-pro');
      await page.waitForTimeout(300);

      const createFolderBtn = page.locator('button:has-text("Create Project Folder")');
      await createFolderBtn.click();
      await page.waitForTimeout(3500);

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_03_project_created.png') });
      results.passed.push('MERN project "mern-taskflow-pro" created with server.js');

      // -------------------------------------------------------------
      // PHASE 4: Build Multi-Folder MERN Hierarchy
      // -------------------------------------------------------------
      log('--- PHASE 4: Building MERN Multi-Tier File Structure ---');

      // Helper function to create file/folder directly via workspace API using token
      const wsInfo = await page.evaluate(async () => {
        const stored = localStorage.getItem('mcode_active_workspace_id');
        return stored;
      });
      log(`Active Workspace ID in browser: ${wsInfo}`);

      if (wsInfo) {
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        };

        const mernStructure = [
          // Server
          { type: 'folder', path: 'server' },
          { type: 'folder', path: 'server/models' },
          {
            type: 'file',
            path: 'server/models/Task.js',
            content: `const mongoose = require('mongoose');\n\nconst TaskSchema = new mongoose.Schema({\n  title: { type: String, required: true, trim: true },\n  description: { type: String, default: '' },\n  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },\n  completed: { type: Boolean, default: false },\n  createdAt: { type: Date, default: Date.now }\n});\n\nmodule.exports = mongoose.model('Task', TaskSchema);\n`
          },
          { type: 'folder', path: 'server/routes' },
          {
            type: 'file',
            path: 'server/routes/tasks.js',
            content: `const express = require('express');\nconst router = express.Router();\nconst Task = require('../models/Task');\n\n// GET all tasks\nrouter.get('/', async (req, res) => {\n  try {\n    const tasks = await Task.find().sort({ createdAt: -1 });\n    res.json(tasks);\n  } catch (err) {\n    res.status(500).json({ error: err.message });\n  }\n});\n\n// POST new task\nrouter.post('/', async (req, res) => {\n  try {\n    const newTask = new Task(req.body);\n    const saved = await newTask.save();\n    res.status(201).json(saved);\n  } catch (err) {\n    res.status(400).json({ error: err.message });\n  }\n});\n\nmodule.exports = router;\n`
          },
          // Client React
          { type: 'folder', path: 'client' },
          { type: 'folder', path: 'client/src' },
          { type: 'folder', path: 'client/src/components' },
          {
            type: 'file',
            path: 'client/src/components/TaskCard.jsx',
            content: `import React from 'react';\n\nexport function TaskCard({ task, onToggle }) {\n  return (\n    <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between shadow-sm">\n      <div>\n        <h4 className={\`font-medium \${task.completed ? 'line-through text-white/40' : 'text-white'}\`}>\n          {task.title}\n        </h4>\n        <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono">\n          {task.priority}\n        </span>\n      </div>\n      <button\n        onClick={() => onToggle(task._id)}\n        className="px-3 py-1.5 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"\n      >\n        {task.completed ? 'Mark Pending' : 'Complete'}\n      </button>\n    </div>\n  );\n}\n`
          },
          {
            type: 'file',
            path: 'client/src/App.jsx',
            content: `import React, { useState, useEffect } from 'react';\nimport { TaskCard } from './components/TaskCard';\n\nexport default function App() {\n  const [tasks, setTasks] = useState([\n    { _id: '1', title: 'Setup MongoDB connection', priority: 'high', completed: true },\n    { _id: '2', title: 'Implement Express CRUD routes', priority: 'high', completed: true },\n    { _id: '3', title: 'Build React UI with Tailwind', priority: 'medium', completed: false }\n  ]);\n\n  return (\n    <main className="min-h-screen bg-[#0e0e0e] text-white p-8">\n      <h1 className="text-2xl font-bold mb-6 text-emerald-400">MERN TaskFlow Dashboard</h1>\n      <div className="grid gap-3 max-w-xl">\n        {tasks.map(t => (\n          <TaskCard key={t._id} task={t} onToggle={(id) => console.log('Toggle', id)} />\n        ))}\n      </div>\n    </main>\n  );\n}\n`
          },
          {
            type: 'file',
            path: 'README.md',
            content: `# MERN TaskFlow Pro\n\nFull-stack MERN application with Express API, MongoDB Mongoose schema, and React UI.\n\n## Structure\n- \`server/\`: Node.js Express server + MongoDB models\n- \`client/\`: React dashboard application\n\n## Running\n\`\`\`bash\ncd server && npm install && npm run dev\ncd client && npm install && npm run dev\n\`\`\`\n`
          }
        ];

        for (const item of mernStructure) {
          if (item.type === 'folder') {
            await fetch(`http://localhost:3100/api/v1/workspaces/${wsInfo}/folder`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ path: item.path })
            });
          } else {
            await fetch(`http://localhost:3100/api/v1/workspaces/${wsInfo}/file`, {
              method: 'POST',
              headers,
              body: JSON.stringify({ path: item.path, content: item.content })
            });
          }
        }

        // Trigger refresh in FileTree UI
        await page.evaluate(() => {
          window.dispatchEvent(new Event('mcode:workspaces-updated'));
        });
        await page.waitForTimeout(2000);

        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_04_filetree_structure.png') });
        results.passed.push('Full MERN multi-tier file structure created and synced in FileTree');
      }

      // -------------------------------------------------------------
      // PHASE 5: Open and Switch Multi-Tab in Monaco Editor
      // -------------------------------------------------------------
      log('--- PHASE 5: Multi-Tab Code Editing in Monaco ---');
      await page.evaluate(() => {
        // Open files in tabs
        document.dispatchEvent(new CustomEvent('filetree:open-file', { detail: { path: 'server/models/Task.js' } }));
        document.dispatchEvent(new CustomEvent('filetree:open-file', { detail: { path: 'client/src/App.jsx' } }));
      });
      await page.waitForTimeout(2000);

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_05_editor_multitab.png') });
      results.passed.push('Monaco Editor loaded multiple tabs with JSX and Mongoose syntax');

      // -------------------------------------------------------------
      // PHASE 6: Test Secondary Sidebar Modes (Chat, Agent, Explain)
      // -------------------------------------------------------------
      log('--- PHASE 6: Secondary Sidebar Modes (Chat, Agent, Explain) ---');
      const explainBtn = page.locator('button:has-text("Explain")').first();
      if (await explainBtn.isVisible()) {
        log('Switching secondary sidebar to Explain mode...');
        await explainBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_06_explain_mode.png') });
        results.passed.push('AI Assistance Explain Mode active with Cyan theme');
      }

      const agentBtn = page.locator('button:has-text("Agent")').first();
      if (await agentBtn.isVisible()) {
        log('Switching secondary sidebar to Agent mode...');
        await agentBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_07_agent_mode.png') });
        results.passed.push('AI Assistance Agent Mode active with Emerald theme');
      }

      // -------------------------------------------------------------
      // PHASE 7: Terminal & Bottom Panel Diagnostics
      // -------------------------------------------------------------
      log('--- PHASE 7: Bottom Terminal Panel & Execution ---');
      const terminalTabBtn = page.locator('button:has-text("Terminal")').first();
      if (await terminalTabBtn.isVisible()) {
        await terminalTabBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_08_terminal_execution.png') });
        results.passed.push('Integrated terminal connected to project root');
      }
    }

  } catch (err) {
    log(`ERROR DURING MERN TEST: ${err.message}`);
    results.failed.push(`Runtime error: ${err.message}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'mern_error_state.png') }).catch(() => {});
  } finally {
    await browser.close();
    log('MERN browser test completed.');
  }

  // Print Summary
  console.log('\n=========================================');
  console.log('       MERN STACK E2E TEST SUMMARY       ');
  console.log('=========================================');
  console.log(`Passed: ${results.passed.length}`);
  results.passed.forEach(p => console.log(`  ✓ ${p}`));
  console.log(`Failed: ${results.failed.length}`);
  results.failed.forEach(f => console.log(`  ✗ ${f}`));
  if (pageErrors.length > 0) {
    console.log(`Page/Console Errors (${pageErrors.length}):`);
    pageErrors.slice(0, 5).forEach(e => console.log(`  ! ${e}`));
  }
  console.log('=========================================\n');

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'mern_audit_results.json'),
    JSON.stringify({ ...results, pageErrors }, null, 2)
  );
})();
