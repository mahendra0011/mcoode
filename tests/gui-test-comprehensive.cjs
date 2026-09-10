const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const errors = [];
  page.on('pageerror', msg => errors.push('PAGE_ERROR: ' + msg.message));
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('ERR_CONNECTION_REFUSED')) {
      errors.push('CONSOLE_ERROR: ' + msg.text());
    }
  });

  // === SETTINGS PAGE TEST ===
  console.log('\n========== SETTINGS PAGE ==========');
  await page.goto('http://localhost:3000/settings', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  console.log('Title:', await page.title());

  // Verify no ZCode text
  const settingsText = await page.evaluate(() => document.body.innerText);
  const settingsHasZCode = /ZCode|zcode|ZCODE/.test(settingsText);
  console.log('Has ZCode text:', settingsHasZCode);

  // All 15 tabs
  const allTabs = ['General', 'Appearance', 'Model settings', 'Browser Use', 'Computer Use',
    'Memory', 'Subagents', 'Plugins', 'MCP Servers', 'Skills', 'Commands', 'Hooks',
    'Indexing', 'Usage stats', 'Onboard'];

  const allTabsFound = await page.evaluate((tabs) => {
    const results = {};
    for (const tab of tabs) {
      // Find the child tab button (has ml-7 class) not the section header
      const buttons = Array.from(document.querySelectorAll('button'));
      const match = buttons.find(b => {
        const t = b.textContent ? b.textContent.trim() : '';
        return t === tab;
      });
      results[tab] = !!match;
    }
    return results;
  }, allTabs);
  console.log('Tabs found in DOM:', JSON.stringify(allTabsFound, null, 2));

  // Click through each tab (use the button with ml-7 class for child tabs)
  for (const tabName of allTabs) {
    const tabBtn = await page.evaluateHandle((name) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      // Prefer child tabs (those with ml-7 in class) over section headers
      for (const b of buttons) {
        const t = b.textContent ? b.textContent.trim() : '';
        const cls = b.className || '';
        if (t === name && cls.includes('ml-7')) return b;
      }
      // Fallback: any button with exact text
      for (const b of buttons) {
        const t = b.textContent ? b.textContent.trim() : '';
        if (t === name) return b;
      }
      return null;
    }, tabName);

    if (tabBtn) {
      await tabBtn.click();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'gui-test-screenshots/final-settings-' + tabName.replace(/ /g, '_') + '.png' });
    } else {
      console.log('NOT FOUND:', tabName);
    }
  }
  console.log('Settings test complete.');

  // === AI CHAT PAGE TEST ===
  console.log('\n========== AI CHAT PAGE ==========');
  await page.goto('http://localhost:3000/ai/chat', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('Title:', await page.title());

  const chatText = await page.evaluate(() => document.body.innerText);
  console.log('Has ZCode text:', /ZCode|zcode|ZCODE/.test(chatText));
  console.log('Has mcode text:', /mcode/.test(chatText));
  console.log('Body text length:', chatText.length);

  // Check CSS variables at :root
  const cssVars = await page.evaluate(() => {
    const root = document.documentElement;
    const vars = ['--mcode-bg', '--mcode-text', '--mcode-green', '--mcode-panel', '--mcode-border', '--mcode-text-dim'];
    const results = {};
    for (const v of vars) {
      results[v] = getComputedStyle(root).getPropertyValue(v).trim();
    }
    return results;
  });
  console.log('CSS variables:', JSON.stringify(cssVars));

  // Check gradient text elements exist
  const gradientCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).filter(e => {
      const s = window.getComputedStyle(e);
      return s.backgroundImage && s.backgroundImage.includes('gradient');
    }).length;
  });
  console.log('Gradient text elements:', gradientCount);

  // Check for BrainCircuit icon (look for svg with specific structure)
  const svgCheck = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('svg')).length;
  });
  console.log('SVG count:', svgCheck);

  // Check for Turn Machine visualization elements
  const turnMachineCheck = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('*'));
    return {
      hasTurnMachineClass: elements.some(e => (e.className || '').includes('turn-machine')),
      hasTurnMachineBtn: elements.some(e => e.textContent && e.textContent.includes('Turn Machine')),
      hasThinkingLabel: elements.some(e => e.textContent && e.textContent.includes('Thinking')),
      hasAnimatedGradient: elements.some(e => (e.className || '').includes('animated-gradient-text')),
      hasChatLoadingAttr: elements.some(e => e.getAttribute && e.getAttribute('data-mcode-chat-loading-animate') === 'true'),
    };
  });
  console.log('Component checks:', JSON.stringify(turnMachineCheck, null, 2));

  await page.screenshot({ path: 'gui-test-screenshots/final-chat-page.png' });

  // === LOGIN PAGE ===
  console.log('\n========== LOGIN PAGE ==========');
  await page.goto('http://localhost:3000/login', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(1000);
  const loginText = await page.evaluate(() => document.body.innerText);
  console.log('Has ZCode text:', /ZCode|zcode|ZCODE/.test(loginText));
  await page.screenshot({ path: 'gui-test-screenshots/final-login.png' });

  console.log('\n=== Page errors ===');
  if (errors.length === 0) {
    console.log('NO ERRORS');
  } else {
    console.log(JSON.stringify(errors, null, 2));
  }

  await browser.close();
  console.log('\n=== ALL TESTS COMPLETE ===');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
