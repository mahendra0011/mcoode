import { test, expect } from '@playwright/test';

test.describe('Terminal check', () => {
  test('terminal receives terminal:write events', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token', refresh: 'fake-refresh'
      }));
    });

    page.on('console', msg => {
      if (msg.type() === 'error') console.log('PAGE ERR:', msg.text().substring(0, 200));
    });
    page.on('pageerror', err => console.log('JS ERROR:', err.message.substring(0, 200)));

    await page.goto('/ai/chat');
    await page.waitForTimeout(2000);

    // Go to AI Code Agent tab
    const agentTab = page.locator('button').filter({ hasText: /AI code Agent/i });
    if (await agentTab.count() > 0) await agentTab.click();
    await page.waitForTimeout(500);

    // Toggle advanced mode
    const advBtn = page.locator('button').filter({ hasText: /Advanced Mode/i });
    if (await advBtn.count() > 0) await advBtn.click();
    await page.waitForTimeout(300);

    // Send message to trigger IDE view
    await page.locator('textarea').last().fill('test');
    await page.locator('textarea').last().press('Enter');
    await page.waitForTimeout(1500);

    // Check placeholder is shown
    const placeholderBefore = await page.locator('text=/No commands run yet/i').count();
    console.log('Placeholder visible before write:', placeholderBefore);

    // Dispatch terminal:write event
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent('terminal:write', { detail: 'HELLO TERMINAL TEST\n' }));
    });
    await page.waitForTimeout(500);

    // Check if placeholder is now hidden
    const placeholderAfter = await page.locator('text=/No commands run yet/i').count();
    console.log('Placeholder visible after write:', placeholderAfter);

    // Check for our test text in the terminal
    const terminalText = await page.evaluate(() => {
      const terminal = document.querySelector('.terminal');
      if (!terminal) return { found: false };
      
      // Search for our test text in all elements
      const allText = terminal.textContent || '';
      const hasOurText = allText.includes('HELLO TERMINAL TEST');
      
      // Also check specific xterm elements
      const rows = terminal.querySelector('.xterm-rows');
      const rowsText = rows ? rows.textContent || '' : '';
      
      // Check all span elements
      const spans = terminal.querySelectorAll('span');
      const spanTexts = Array.from(spans).map(s => s.textContent || '');
      const foundInSpans = spanTexts.some(t => t.includes('HELLO'));
      
      // Check the xterm-screen
      const screen = terminal.querySelector('.xterm-screen');
      const screenText = screen ? screen.textContent || '' : 'none';
      
      return {
        found: true,
        hasOurText,
        rowsTextPreview: rowsText.substring(0, 200),
        foundInSpans,
        screenTextPreview: screenText.substring(0, 200),
        totalSpans: spans.length,
        totalTextLength: allText.length
      };
    });
    console.log('Terminal text check:', JSON.stringify(terminalText, null, 2));

    // Check if there's a hidden input (xterm uses a textarea for input)
    const hiddenInput = await page.evaluate(() => {
      return !!document.querySelector('textarea.xterm-helper-textarea, input.xterm-helper-textarea');
    });
    console.log('Has helper textarea:', hiddenInput);

    // Check terminal dimensions
    const dimensions = await page.evaluate(() => {
      const terminal = document.querySelector('.terminal');
      if (!terminal) return { found: false };
      const rect = terminal.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        display: getComputedStyle(terminal).display,
        visibility: getComputedStyle(terminal).visibility,
        opacity: getComputedStyle(terminal).opacity,
      };
    });
    console.log('Terminal dimensions:', JSON.stringify(dimensions));
  });
});
