const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', msg => errors.push('PAGE_ERROR: ' + msg.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE_ERROR: ' + msg.text());
  });

  await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
  console.log('SETTINGS PAGE TITLE:', await page.title());
  console.log('SETTINGS PAGE URL:', page.url());

  const tabs = ['General', 'Appearance', 'Model settings', 'Browser Use', 'Computer Use',
    'Memory', 'Subagents', 'Plugins', 'MCP Servers', 'Skills', 'Commands', 'Hooks',
    'Indexing', 'Usage stats', 'Onboard'];

  // Try to expand the Plugins section header first
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    const cls = await btn.getAttribute('class') || '';
    if (text && text.trim() === 'Plugins' && cls.includes('rounded-xl') && cls.includes('py-2')) {
      console.log('Expanding Plugins section...');
      await btn.click();
      await page.waitForTimeout(300);
      break;
    }
  }

  for (const tabName of tabs) {
    console.log('\n=== Tab: ' + tabName + ' ===');
    try {
      // Find tab button by exact text match
      const tabBtn = await page.evaluateHandle((name) => {
        const buttons = Array.from(document.querySelectorAll('button'));
        for (const b of buttons) {
          const t = b.textContent ? b.textContent.trim() : '';
          if (t === name) {
            return b;
          }
        }
        return null;
      }, tabName);

      if (tabBtn) {
        await tabBtn.click();
        await page.waitForTimeout(500);

        // Get the active tab text
        const activeTab = await page.evaluate(() => {
          const active = document.querySelector('button.bg-\\[var\\(--mcode-green');
          if (active) return active.textContent?.trim();
          // Try to find active by class pattern
          const btns = Array.from(document.querySelectorAll('button'));
          for (const b of btns) {
            const cls = b.className;
            if (cls.includes('mcode-green') && (cls.includes('bg-') || cls.includes('text-[var(--mcode-green'))) {
              return b.textContent?.trim();
            }
          }
          return null;
        });
        console.log('  Active tab:', activeTab);

        // Get content
        const contentLen = await page.evaluate(() => {
          const main = document.querySelector('main');
          return main ? main.textContent?.length : 0;
        });
        console.log('  Content length:', contentLen);

        // Screenshot
        await page.screenshot({ path: 'gui-test-screenshots/settings-' + tabName.replace(/ /g, '_') + '.png' });
        console.log('  Screenshot saved');
      } else {
        console.log('  NOT FOUND');
      }
    } catch(e) {
      console.log('  ERROR:', e.message);
    }
  }

  console.log('\n=== Page errors ===');
  if (errors.length === 0) {
    console.log('NO ERRORS');
  } else {
    console.log(JSON.stringify(errors, null, 2));
  }

  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
