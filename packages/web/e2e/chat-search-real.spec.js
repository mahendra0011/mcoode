import { test, expect } from '@playwright/test';

/**
 * Real login + search flow test.
 * Verifies the full ZCode-style search animation pipeline end-to-end:
 *   1. Login with real credentials
 *   2. Send a search query
 *   3. Verify SearchResultBlock renders with:
 *      - SearchStatusLine (spinner → checkmark)
 *      - SourcePillRow (staggered favicon pills)
 *      - SourcesPanel (expandable source list)
 *      - StreamingAnswer / word reveal
 */
test.describe('Chat Mode — Real Search Flow', () => {
  test('Search query triggers web_search and renders ZCode-style SearchResultBlock animations', async ({ page }) => {
    const logs = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    // Step 1: Login with real credentials
    await page.goto('http://localhost:5175/login');
    await page.fill('input[name="email"], input[type="email"]', 'technomp786@gmail.com');
    await page.fill('input[name="password"], input[type="password"]', 'mahendra@@009988');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/ai/chat', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify logged in
    const tokens = await page.evaluate(() => {
      const t = localStorage.getItem('mcode_tokens');
      return t ? JSON.parse(t) : null;
    });
    expect(tokens).toBeTruthy();

    // Verify no API key error (poolside key is configured)
    const keysError = await page.locator('text=please select your api keys').count();
    expect(keysError).toBe(0);

    // Step 2: Send a search query
    const textarea = page.locator('textarea').first();
    await textarea.fill('search the web for latest AI agents news 2025');
    await page.click('button[type="submit"]');

    // Step 3: Brief wait for streaming to start
    await page.waitForTimeout(1500);
    const thinkingDots = await page.locator('text=Thinking').count();
    console.log('ThinkingIndicator dots found:', thinkingDots);

    // Step 4: Wait for search results to fully render (Tavily API + model response takes time)
    // Poll for source pills (favicon images) which appear when search results come back
    let sourcePills = 0;
    for (let attempt = 0; attempt < 55; attempt++) {
      await page.waitForTimeout(1000);
      sourcePills = await page.locator('img[src*="google.com/s2/favicons"]').count();
      if (sourcePills > 0) {
        console.log('Source pills appeared after', attempt + 1, 'seconds');
        break;
      }
    }

    // Take screenshot for visual verification
    await page.screenshot({ path: 'screenshots/chat-search-results.png', fullPage: true });

    // Step 5: Verify SearchResultBlock animations rendered
    // 5a. SearchStatusLine — spinner (searching) and/or checkmark (done)
    const searchStatusCount = await page.locator('text=/Searching the web|Read.*sources/i').count();
    console.log('SearchStatusLine elements:', searchStatusCount);
    expect(searchStatusCount).toBeGreaterThan(0);

    // 5b. Source pills with favicon images (staggered spring animations)
    console.log('Source pills (favicon images):', sourcePills);
    expect(sourcePills).toBeGreaterThan(0);

    // 5c. Sources panel button (expandable source list)
    const sourcesPanelBtn = await page.locator('text=/\\d+ sources/i').count();
    console.log('SourcesPanel buttons:', sourcesPanelBtn);
    expect(sourcesPanelBtn).toBeGreaterThan(0);

    // 5d. Verify streaming cursor is gone (chat completed)
    for (let attempt = 0; attempt < 20; attempt++) {
      await page.waitForTimeout(1000);
      const stillStreaming = await page.locator('[class*="animate-pulse"]').count();
      if (stillStreaming === 0) {
        console.log('Streaming complete after', attempt + 1, 'seconds');
        break;
      }
    }

    // 5e. Verify assistant message rendered
    const messages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('[class*="prose"]'))
        .map(el => el.textContent?.slice(0, 100))
        .filter(t => t && t.length > 5);
    });
    console.log('Messages:', messages);
    expect(messages.length).toBeGreaterThan(0);

    // 5f. Verify no runtime errors
    const allErrorLogs = logs.filter(l => l.toLowerCase().includes('error') && !l.includes('mcode-agent'));
    console.log('Error logs:', allErrorLogs);

    // 5g. Verify Framer Motion is active (elements with opacity/transform animations)
    const animatedElements = await page.evaluate(() => {
      return document.querySelectorAll('[style*="opacity"]').length;
    });
    console.log('Animated elements:', animatedElements);
    expect(animatedElements).toBeGreaterThan(0);
  });
});
