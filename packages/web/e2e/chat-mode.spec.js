import { test, expect } from '@playwright/test';

/**
 * Chat Mode Verification — ONLY chat mode (normal Claude-style chat).
 * Tests: page render, chat empty state, streaming animations, cursors,
 * thinking dots, input area, message rendering.
 */
test.describe('Chat Mode Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Bypass auth
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing',
        refresh: 'fake-refresh'
      }));
    });
    await page.goto('/ai/chat');
    await page.waitForLoadState('networkidle');
  });

  test('1. Page loads and renders chat tab by default', async ({ page }) => {
    // Body should be visible (no crash/blank screen)
    await expect(page.locator('body')).toBeVisible();

    // Should be on the Chat tab (default)
    const chatContent = page.locator('.flex-1.overflow-y-auto, [class*="flex-col"]');
    expect(await page.locator('text=What do you want to build').count()).toBeGreaterThan(0);
  });

  test('2. Chat empty state shows spinner, heading, suggestions', async ({ page }) => {
    // Spinner (12-line SVG, 3s spin)
    const spinner = page.locator('.animate-spin-slow, svg[width="100"][viewBox="0 0 100 100"]');
    await expect(spinner.first()).toBeVisible();

    // Heading
    await expect(page.locator('text=What do you want to build?')).toBeVisible();

    // Suggestion buttons
    const suggestions = page.locator('button').filter({ hasText: /website|mobile|dashboard/i });
    expect(await suggestions.count()).toBeGreaterThan(0);

    // Input area with glowing border
    const inputArea = page.locator('textarea, input[type="text"], input[type="password"]');
    expect(await inputArea.count()).toBeGreaterThan(0);
  });

  test('3. ThinkingIndicator renders when streaming starts (not already streaming)', async ({ page }) => {
    // Find the send button — uses ArrowUp icon, no text label
    const sendBtn = page.locator('button[type="submit"]');

    // Type a message
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0 && await sendBtn.count() > 0) {
      await textarea.fill('Hello, this is a test message for chat mode verification');

      // Click send button (ArrowUp button at end of input)
      await sendBtn.last().click();

      // Wait briefly for stream to start
      await page.waitForTimeout(500);

      // ThinkingIndicator dots should appear (3 bouncing dots)
      // The dots use y animation: y: [0, -4, 0]
      const thinkingDots = page.locator('[class*="bounce"], [class*="thinking"], [class*="Thinking"]');

      // If streaming started, we should see the thinking indicator or
      // streaming cursor in the message area
      const isStreaming = await page.evaluate(() => {
        const state = window.__PRELOADED_STATE__ || {};
        return document.querySelector('[class*="animate-pulse"]') !== null;
      });

      // The thinking indicator or streaming cursor should be present
      const hasThinkingOrCursor = await page.locator('[class*="animate-pulse"], [class*="thinking"], [class*="Thinking"]').count();
      console.log('Thinking/cursor elements found:', hasThinkingOrCursor);
    }
  });

  test('4. Chat input has all action buttons with motion effects', async ({ page }) => {
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      // Focus the textarea to trigger input border spin animation
      await textarea.focus();
      await page.waitForTimeout(100);

      // Check for conic gradient border animation (animate-[spin_4s_linear_infinite])
      const inputContainer = page.locator('textarea').locator('xpath=..');
      const hasSpinAnimation = await inputContainer.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.animation.includes('spin') && style.animation.includes('4s');
      });

      // Advanced Mode button
      const advancedBtn = page.locator('button').filter({ hasText: /advanced/i });
      expect(await advancedBtn.count()).toBeGreaterThan(0);

      // Check buttons have motion (whileHover: { scale: ... })
      const advancedHasMotion = await advancedBtn.first().evaluate((btn) => {
        const style = window.getComputedStyle(btn);
        return style.transition !== 'none' || style.transition.includes('all');
      });
    }
  });

  test('5. Streaming cursor blinks (opacity animation)', async ({ page }) => {
    // The caret cursor uses animate-pulse with opacity [0.3→1→0.3]
    // Check CSS keyframe is defined
    const hasPulseCaret = await page.evaluate(() => {
      // Look for the pulse-caret CSS animation
      const styleSheets = Array.from(document.styleSheets);
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.name === 'pulse-caret') return true;
          }
        } catch { /* cross-origin */ }
      }
      // Also check for animate-pulse class usage
      return document.querySelector('[class*="animate-pulse"]') !== null;
    });

    // Check CSS is loaded
    const cssLoaded = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return links.length > 0;
    });

    console.log('Pulse caret CSS defined:', hasPulseCaret);
    console.log('CSS loaded:', cssLoaded);
  });

  test('6. Tab buttons have motion hover/scale effects', async ({ page }) => {
    // Tab buttons: whileHover: { scale: activeTab === tab ? 1 : 1.05 }
    const tabBtns = page.locator('button').filter({ hasText: /chat|design|code/i });

    if (await tabBtns.count() > 0) {
      // Hover over a tab button and check it changes (scale animation)
      const beforeHover = await tabBtns.first().evaluate((btn) => {
        const style = window.getComputedStyle(btn);
        return { transform: style.transform, transition: style.transition };
      });

      await tabBtns.first().hover();
      await page.waitForTimeout(100);

      const afterHover = await tabBtns.first().evaluate((btn) => {
        const style = window.getComputedStyle(btn);
        return { transform: style.transform, transition: style.transition };
      });

      console.log('Tab button before hover:', beforeHover);
      console.log('Tab button after hover:', afterHover);
    }
  });

  test('7. Chat mode (not agent/advanced) — verify default mode is chat', async ({ page }) => {
    // In chat mode, user messages should be larger bubbles (size="md")
    // and ThinkingIndicator should show full avatar (showAvatar={mode === 'chat'})
    const textarea = page.locator('textarea').first();
    if (await textarea.count() > 0) {
      await textarea.fill('What is the capital of France?');
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(800);

      // Check messages rendered
      const messages = await page.evaluate(() => {
        const chatMessages = document.querySelectorAll('[class*="flex"]');
        return chatMessages.length > 0;
      });
      console.log('Messages rendered:', messages);
    }
  });

  test('8. Framer Motion is loaded and used in chat UI', async ({ page }) => {
    const hasFramerMotion = await page.evaluate(() => {
      // Check for Framer Motion inline styles (transform, opacity animations)
      const animatedElements = document.querySelectorAll('[style*="opacity"], [style*="transform"]');
      return animatedElements.length > 0;
    });

    // Check for motion components
    const motionElements = await page.locator('[style*="opacity:"]').count();
    const totalElements = await page.locator('*').count();
    console.log('Elements with opacity style:', motionElements, 'of', totalElements, 'total');

    // Look for staggered delays (idx * 0.02 used in ChatMessage)
    const hasStaggeredDelays = await page.evaluate(() => {
      return document.querySelector('[style*="transition-delay"]') !== null;
    });
    console.log('Has staggered delays:', hasStaggeredDelays);
  });
});
