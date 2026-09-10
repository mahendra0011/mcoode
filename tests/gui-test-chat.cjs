const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  // === AI CHAT PAGE ===
  console.log('\n========== AI CHAT PAGE ==========');
  await page.goto('http://localhost:3000/ai/chat', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);
  console.log('Title:', await page.title());

  const chatAnalysis = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    const elements = Array.from(document.querySelectorAll('*'));
    const safeClass = (el) => {
      const c = el.className;
      return typeof c === 'string' ? c : '';
    };
    return {
      hasZCode: /ZCode|zcode|ZCODE/.test(bodyText),
      hasMcode: /mcode/.test(bodyText),
      bodyLength: bodyText.length,
      svgCount: elements.filter(e => e.tagName === 'SVG').length,
      gradientElements: elements.filter(e => {
        const s = window.getComputedStyle(e);
        return s.backgroundImage && s.backgroundImage.includes('gradient');
      }).length,
      animatedGradientText: elements.filter(e => safeClass(e).includes('animated-gradient-text')).length,
      chatLoadingAnimate: elements.filter(e => e.getAttribute && e.getAttribute('data-mcode-chat-loading-animate') === 'true').length,
      streamAnimate: elements.filter(e => e.getAttribute && e.getAttribute('data-mcode-stream-animate') === 'true').length,
      brainCircuit: elements.filter(e => {
        const s = safeClass(e);
        return s.includes('BrainCircuit') || (s.includes('brain') && s.includes('circuit'));
      }).length,
      hasTurnMachineBtn: elements.some(e => e.textContent && e.textContent.includes('Turn Machine')),
      hasThinkingText: elements.some(e => e.textContent && e.textContent.includes('Thinking')),
      hasSpinnerFrames: elements.some(e => {
        const t = e.textContent || '';
        return ['●', '◐', '◓', '◑', '◒'].some(c => t.includes(c));
      }),
    };
  });
  console.log('Chat page analysis:', JSON.stringify(chatAnalysis, null, 2));

  // Print the actual body text
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body text:', bodyText.substring(0, 500));

  await page.screenshot({ path: 'gui-test-screenshots/final-chat-page.png', fullPage: true });

  await browser.close();
  console.log('\nDONE');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
