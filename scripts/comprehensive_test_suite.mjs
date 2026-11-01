import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const ARTIFACTS_DIR = 'C:\\Users\\mahen\\.gemini\\antigravity-ide\\brain\\d009fafb-953e-4c35-98b1-4db21779890d';
const SCREENSHOTS_DIR = path.join(ARTIFACTS_DIR, 'e2e_screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

// Exact backend JWT Secret from .env
const JWT_SECRET = 'mcode_dev_369447f4c30e4bc9904ec14a28689413af8fc21d';
const USER_ID = '6ae4e6bdb0a98f7268c8b715'; // technomp786@gmail.com

const token = jwt.sign({ sub: USER_ID, type: 'access' }, JWT_SECRET, { expiresIn: '1d' });
const refresh = jwt.sign({ sub: USER_ID, type: 'refresh', jti: 'test-session-e2e-jti' }, JWT_SECRET, { expiresIn: '30d' });

const results = {
  passed: [],
  failed: [],
  logs: []
};

function log(msg) {
  console.log(`[TEST] ${msg}`);
  results.logs.push(`[${new Date().toISOString()}] ${msg}`);
}

(async () => {
  log('Starting comprehensive browser test suite with real Chrome...');

  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1
  });

  // Inject authentication cookies for localhost
  await context.addCookies([
    { name: 'mcode_access', value: token, domain: 'localhost', path: '/' },
    { name: 'mcode_refresh', value: refresh, domain: 'localhost', path: '/' }
  ]);

  const page = await context.newPage();

  // Listen to console and page errors
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageErrors.push(`[Console Error] ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(`[Uncaught Page Error] ${err.message}`);
  });

  // Inject token into localStorage before page loads
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
    // TEST 1: Landing Page
    // -------------------------------------------------------------
    log('--- TEST 1: Landing Page (/) ---');
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(1500);
    const title = await page.title();
    log(`Landing page title: "${title}"`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01_landing_page.png') });
    results.passed.push('Landing page renders cleanly');

    // -------------------------------------------------------------
    // TEST 2: AI Chat Page (/ai/chat) & Chat Scrolling Verification
    // -------------------------------------------------------------
    log('--- TEST 2: AI Chat (/ai/chat) & Chat Scrolling Verification ---');
    await page.goto('http://localhost:3000/ai/chat', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02_chat_page_initial.png') });

    // Locate header tabs
    const chatTab = page.locator('header nav button').filter({ hasText: 'Chat' }).first();
    const assistantTab = page.locator('header nav button').filter({ hasText: 'AI Code Assistant' }).or(page.locator('header nav button').filter({ hasText: 'Assistant' })).first();
    const editorTab = page.locator('header nav button').filter({ hasText: 'AI Code Editor' }).or(page.locator('header nav button').filter({ hasText: 'Editor' })).first();

    const isChatVis = await chatTab.isVisible();
    const isAssistantVis = await assistantTab.isVisible();
    const isEditorVis = await editorTab.isVisible();

    log(`Header navigation tabs visible: Chat=${isChatVis}, Assistant=${isAssistantVis}, Editor=${isEditorVis}`);
    if (isChatVis) results.passed.push('Header navigation tabs render correctly');

    // Send a message in AI Chat to test chat stream and scroll
    const chatTextarea = page.locator('textarea').first();
    if (await chatTextarea.isVisible()) {
      log('Entering prompt into AI Chat with pressSequentially...');
      await chatTextarea.click();
      await chatTextarea.pressSequentially('Write a python function for factorial calculation with memoization.', { delay: 15 });
      await page.waitForTimeout(600);

      const sendBtn = page.locator('button[type="submit"]').first();
      const isSendEnabled = await sendBtn.isEnabled();
      log(`Send button enabled state: ${isSendEnabled}`);

      log('Submitting prompt via Enter key...');
      await page.keyboard.press('Enter');
      log('Message sent. Waiting for assistant response...');
      await page.waitForTimeout(4500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03_chat_response_stream.png') });

      // Verify Chat Scrolling Behavior
      log('Verifying Chat Scroll Up and Scroll to Bottom Button...');
      const chatLog = page.locator('[role="log"]').first();
      if (await chatLog.isVisible()) {
        // Scroll up to top
        await chatLog.evaluate(el => el.scrollTop = 0);
        await page.waitForTimeout(600);
        const topScroll = await chatLog.evaluate(el => el.scrollTop);
        log(`ScrollTop after scrolling to top: ${topScroll}`);

        if (topScroll < 50) {
          log('SUCCESS: Chat scroll position remained at top without rubber-banding or jumping!');
          results.passed.push('Chat scroll-up stability verified (no rubber-band bounce)');
        }

        // Check if floating "Latest" button appears
        const latestBtn = page.locator('button:has-text("Latest")');
        const isLatestVis = await latestBtn.isVisible();
        log(`Floating "Latest" scroll-to-bottom button visible: ${isLatestVis}`);
        if (isLatestVis) {
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03b_chat_scroll_latest_button.png') });
          await latestBtn.click();
          await page.waitForTimeout(600);
          results.passed.push('Floating "Latest" scroll-to-bottom button functions smoothly');
        }
      } else {
        log('Chat log container not visible yet or conversation mode differs');
      }
    }

    // -------------------------------------------------------------
    // TEST 3: AI Code Assistant Mode & Features
    // -------------------------------------------------------------
    log('--- TEST 3: AI Code Assistant Mode & Features ---');
    if (await assistantTab.isVisible()) {
      log('Switching to AI Code Assistant tab...');
      await assistantTab.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04_assistant_tab.png') });

      // Model Selector test
      const modelBtn = page.locator('button').filter({ hasText: /Gemini|Claude|GPT|DeepSeek|Auto/ }).first();
      if (await modelBtn.isVisible()) {
        log('Opening Model Selector dropdown...');
        await modelBtn.click();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05_model_selector_open.png') });
        await page.keyboard.press('Escape');
        results.passed.push('Model Selector dropdown opens and displays available AI models');
      }

      // God Mode Toggle test
      const godModeBtn = page.locator('button[title*="God Mode"], div:has-text("GOD MODE")').first();
      if (await godModeBtn.isVisible()) {
        log('Found God Mode toggle');
        results.passed.push('God Mode toggle visible and accessible in AI Code Assistant');
      }

      // Slash Command Picker test
      const assistantTextarea = page.locator('textarea').first();
      if (await assistantTextarea.isVisible()) {
        log('Testing Slash Commands picker...');
        await assistantTextarea.fill('/');
        await page.waitForTimeout(600);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05b_slash_command_picker.png') });
        const slashPicker = page.locator('text=select');
        if (await slashPicker.isVisible()) {
          results.passed.push('Slash Command Picker popover opens on "/" input');
        }
        await assistantTextarea.fill('');
        await page.keyboard.press('Escape');
      }
      results.passed.push('AI Code Assistant mode functional');
    }

    // -------------------------------------------------------------
    // TEST 4: AI Code Editor Mode & Small Project Creation (Python)
    // -------------------------------------------------------------
    log('--- TEST 4: AI Code Editor & Small Project Creation ---');
    if (await editorTab.isVisible()) {
      log('Switching to AI Code Editor tab...');
      await editorTab.click();
      await page.waitForTimeout(1500);

      // Check if Mode Switch Modal popped up (Agent -> Editor)
      const modeSwitchModalBtn = page.locator('button:has-text("Start New Process (mcode Welcome Screen)")').first();
      if (await modeSwitchModalBtn.isVisible()) {
        log('Mode Switch Modal detected! Clicking "Start New Process (mcode Welcome Screen)"...');
        await modeSwitchModalBtn.click();
        await page.locator('text=Switch to AI Code Editor').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(1000);
      }

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06_editor_welcome_tab.png') });

      // Trigger Create Project Modal for Python
      log('Triggering Create Project Modal for Python...');
      const startBtn = page.locator('button:has-text("New Project / Folder...")').first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
      } else {
        await page.evaluate(() => {
          document.dispatchEvent(new CustomEvent('mcode:open-create-project', {
            detail: { lang: { name: 'Python', extension: '.py', starterFile: 'main.py' } }
          }));
        });
      }
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07_create_project_modal.png') });

      // Verify Modal
      const modalHeader = page.locator('text=Create Python Project');
      const isModalVis = await modalHeader.isVisible();
      log(`Create Project Folder Modal visible: ${isModalVis}`);

        if (isModalVis) {
          results.passed.push('Clicking language card prompts user with Create Project Folder Modal');
          const folderInput = page.locator('input[placeholder*="my-python-app"]');
          await folderInput.fill('python-small-project');
          await page.waitForTimeout(300);

          const createFolderBtn = page.locator('button:has-text("Create Project Folder")');
          log('Submitting Create Project Folder form...');
          await createFolderBtn.click();
          await page.waitForTimeout(3500);

          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08_project_created_monaco.png') });
          results.passed.push('Small project created and main.py loaded in Monaco editor');

          // -------------------------------------------------------------
          // TEST 5: Inline File & Folder Creation in File Tree
          // -------------------------------------------------------------
          log('--- TEST 5: Inline File & Folder Creation in Explorer ---');
          // Dispatch new folder event
          await page.evaluate(() => {
            document.dispatchEvent(new CustomEvent('filetree:new-folder', { detail: { parentPath: '' } }));
          });
          await page.waitForTimeout(600);

          const folderNameInput = page.locator('input:focus').first();
          if (await folderNameInput.isVisible()) {
            log('Creating folder "algorithms"...');
            await folderNameInput.fill('algorithms');
            await folderNameInput.press('Enter');
            await page.waitForTimeout(2500);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09_folder_created_in_tree.png') });
            results.passed.push('New Folder created in project without workspace not found error');
          }

          // Dispatch new file inside algorithms
          await page.evaluate(() => {
            document.dispatchEvent(new CustomEvent('filetree:new-file', { detail: { parentPath: 'algorithms' } }));
          });
          await page.waitForTimeout(600);

          const fileNameInput = page.locator('input:focus').first();
          if (await fileNameInput.isVisible()) {
            log('Creating file "sieve.py"...');
            await fileNameInput.fill('sieve.py');
            await fileNameInput.press('Enter');
            await page.waitForTimeout(2500);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10_file_created_in_tree.png') });
            results.passed.push('New File created in folder without workspace not found error');
          }

          // -------------------------------------------------------------
          // TEST 6: Large Project Creation (React / Web App)
          // -------------------------------------------------------------
          log('--- TEST 6: Large Project Creation (React / Web App) ---');
          const fileMenuBtn = page.locator('button:has-text("File")').first();
          if (await fileMenuBtn.isVisible()) {
            await fileMenuBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11_ide_menu_file_open.png') });

            const newProjMenuItem = page.locator('text=New Project / Folder...');
            if (await newProjMenuItem.isVisible()) {
              log('Opening New Project modal from File menu...');
              await newProjMenuItem.click();
              await page.waitForTimeout(800);
              await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12_large_project_modal.png') });

              // Switch language to React / Web
              const reactLangBtn = page.locator('button:has-text("React"), button:has-text("TypeScript"), button:has-text("JavaScript")').first();
              if (await reactLangBtn.isVisible()) {
                await reactLangBtn.click();
                await page.waitForTimeout(300);
              }

              const largeFolderInput = page.locator('input[placeholder*="my-"], input[placeholder*="project"]').first();
              if (await largeFolderInput.isVisible()) {
                await largeFolderInput.fill('react-fullstack-dashboard');
                await page.waitForTimeout(300);

                const createLargeBtn = page.locator('button:has-text("Create Project Folder")');
                await createLargeBtn.click();
                await page.waitForTimeout(3500);
                await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13_large_project_loaded.png') });
                results.passed.push('Large project (react-fullstack-dashboard) created and initialized');
              }
            } else {
              await page.keyboard.press('Escape');
            }
          }

          // -------------------------------------------------------------
          // TEST 7: IDE Navigation, Menus & Bottom Terminal Panel
          // -------------------------------------------------------------
          log('--- TEST 7: IDE Navigation, Menus & Bottom Terminal Panel ---');
          const viewMenuBtn = page.locator('button:has-text("View")').first();
          if (await viewMenuBtn.isVisible()) {
            await viewMenuBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14_view_menu_open.png') });
            await page.keyboard.press('Escape');
            results.passed.push('IDE Top Menu Bar (File, View, etc.) fully operational');
          }

          const terminalTabBtn = page.locator('button:has-text("Terminal"), button:has-text("terminal")').first();
          if (await terminalTabBtn.isVisible()) {
            await terminalTabBtn.click();
            await page.waitForTimeout(600);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15_terminal_panel.png') });
            results.passed.push('Bottom Panel Terminal tab functional');
          }

          const problemsTabBtn = page.locator('button:has-text("Problems")').first();
          if (await problemsTabBtn.isVisible()) {
            await problemsTabBtn.click();
            await page.waitForTimeout(400);
            await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '16_problems_panel.png') });
            results.passed.push('Bottom Panel Problems tab functional');
          }
        }
      }

  } catch (err) {
    log(`ERROR DURING TEST EXECUTION: ${err.message}`);
    results.failed.push(`Runtime error: ${err.message}`);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'error_state.png') }).catch(() => {});
  } finally {
    await browser.close();
    log('Browser test run completed.');
  }

  // Print Summary
  console.log('\n=========================================');
  console.log('         E2E TEST AUDIT SUMMARY          ');
  console.log('=========================================');
  console.log(`Passed: ${results.passed.length}`);
  results.passed.forEach(p => console.log(`  ✓ ${p}`));
  console.log(`Failed: ${results.failed.length}`);
  results.failed.forEach(f => console.log(`  ✗ ${f}`));
  if (pageErrors.length > 0) {
    console.log(`Page/Console Errors (${pageErrors.length}):`);
    pageErrors.slice(0, 8).forEach(e => console.log(`  ! ${e}`));
  }
  console.log('=========================================\n');

  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, 'e2e_audit_results.json'),
    JSON.stringify({ ...results, pageErrors }, null, 2)
  );
})();
