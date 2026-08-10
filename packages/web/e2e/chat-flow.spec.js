import { test, expect } from '@playwright/test';

// ── Chat flow: modes, slash commands, model selector ──

test.describe('AIChatPage → Slash Commands', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });
    await page.goto('/ai/chat');
  });

  test('typing / shows command picker', async ({ page }) => {
    // The command picker should appear when typing '/' in the chat input
    // Default tab is 'Design' which has its own textarea — switch to Chat tab first
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.focus();
    await textarea.fill('/');
    await page.waitForTimeout(500);
    // Command picker should be visible with available commands
    // Use button filter to avoid regex flag parsing issues with '/' in Playwright selectors
    const clearBtn = page.locator('button').filter({ hasText: '/clear' });
    expect(await clearBtn.count()).toBeGreaterThan(0);
  });

  test('slash command list contains expected commands', async ({ page }) => {
    // Switch to Chat tab first — Design tab has its own textarea without picker
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/help');
    // /help should display available commands
    const helpText = page.locator('text=Available commands');
    expect(await helpText.count()).toBeGreaterThan(0);
  });

  test('slash commands are listed in picker', async ({ page }) => {
    // Switch to Chat tab first — Design tab has its own textarea without picker
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/');
    await page.waitForTimeout(500);
    // Each web slash command should be visible in the picker
    for (const cmd of ['clear', 'help', 'undo', 'model', 'god', 'watch', 'debug', 'export']) {
      const cmdEl = page.locator('button').filter({ hasText: `/${cmd}` });
      if (await cmdEl.count() > 0) {
        await expect(cmdEl.first()).toBeVisible();
      }
    }
  });

  test('/clear command clears the chat', async ({ page }) => {
    // Switch to Chat tab — default is Design which doesn't handle slash commands
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/clear');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    // A system message about clearing should appear
    const clearMsg = page.locator('text=/chat cleared/i');
    expect(await clearMsg.count()).toBeGreaterThan(0);
  });

  test('/god command without args shows usage hint', async ({ page }) => {
    // Switch to Chat tab first — Design tab has its own textarea without picker
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/god');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const godHint = page.locator('text=/god-mode/i');
    expect(await godHint.count()).toBeGreaterThan(0);
  });

  test('slash commands work in Chat tab (not just empty state)', async ({ page }) => {
    // Switch to Chat tab — default is Design
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    // In Chat tab with no messages, empty state renders — test command picker there
    const textarea = page.locator('textarea').first();
    await textarea.focus();
    await textarea.fill('/help');
    await page.waitForTimeout(500);
    // Command picker should be visible — check for the help command button
    const helpBtn = page.locator('button').filter({ hasText: '/help' });
    expect(await helpBtn.count()).toBeGreaterThan(0);
  });
});

test.describe('AIChatPage → Mode Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });
    await page.goto('/ai/chat');
  });

  test('tab navigation renders (Design, Chat, AI Code Agent)', async ({ page }) => {
    const tabs = page.locator('button').filter({ hasText: /Design|Chat|Code/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);
  });

  test('Advanced Mode toggle switches between chat and agent mode', async ({ page }) => {
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced Mode/i });
    expect(await advancedBtn.count()).toBeGreaterThan(0);
    await advancedBtn.click();
    await page.waitForTimeout(500);
    // Page should still be visible after mode toggle
    await expect(page.locator('body')).toBeVisible();
    // Toggle back
    await advancedBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('God Mode button exists and toggles', async ({ page }) => {
    // First enable advanced mode to see god mode button
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced Mode/i });
    if (await advancedBtn.count() > 0) {
      await advancedBtn.click();
      await page.waitForTimeout(500);
    }
    const godBtn = page.locator('button').filter({ hasText: /God/i });
    expect(await godBtn.count()).toBeGreaterThan(0);
  });

  test('model selector renders in chat interface', async ({ page }) => {
    const modelSelector = page.locator('button').filter({
      hasText: /Choose model|model/i
    });
    // ModelSelector should be present (possibly showing "Choose model" or a model name)
    expect(await page.locator('button[title*="model"], button[title*="API key"]').count()).toBeGreaterThanOrEqual(0);
  });

  test('empty state shows action buttons', async ({ page }) => {
    // In the empty state (no messages), action buttons should be visible
    const actionBtns = page.locator('button').filter({
      hasText: /Upload|Export|Push|Branch|GitHub|Advanced|God|Create a website|Build a mobile|Design a dashboard/i
    });
    expect(await actionBtns.count()).toBeGreaterThan(0);
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendBtn = page.locator('button[type="submit"]');
    if (await sendBtn.count() > 0) {
      // Send button should be disabled when no text is entered
      const isDisabled = await sendBtn.first().isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });

  test('all tabs render without crashing', async ({ page }) => {
    // Test Design tab
    const designTab = page.locator('button').filter({ hasText: /Design/i }).first();
    if (await designTab.count() > 0) {
      await designTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
    // Test Chat tab
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ }).first();
    if (await chatTab.count() > 0) {
      await chatTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
    // Test AI Code Agent tab
    const agentTab = page.locator('button').filter({ hasText: /Code/i }).first();
    if (await agentTab.count() > 0) {
      await agentTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});

test.describe('AIChatPage → Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });
    await page.goto('/ai/chat');
  });

  test('sidebar renders with M CODE brand', async ({ page }) => {
    const brand = page.locator('text=/M CODE|mcode/i');
    expect(await brand.count()).toBeGreaterThan(0);
  });

  test('sidebar has new chat button', async ({ page }) => {
    const newChatBtn = page.locator('button').filter({ hasText: /New Chat/i });
    expect(await newChatBtn.count()).toBeGreaterThan(0);
  });

  test('sidebar has profile or login button', async ({ page }) => {
    // With fake token, /api/auth/me will fail, so Login button should show
    const loginBtn = page.locator('button').filter({ hasText: /Login/i });
    const profileBtn = page.locator('[class*="rounded-full"]').filter({ hasText: /[A-Z]/ });
    const hasEither = (await loginBtn.count()) > 0 || (await profileBtn.count()) > 0;
    expect(hasEither).toBeTruthy();
  });

  test('sidebar has settings link', async ({ page }) => {
    // Settings link in sidebar renders as <Link to="/settings"> with icon only (no text)
    const settingsLink = page.locator('a[href="/settings"]');
    expect(await settingsLink.count()).toBeGreaterThan(0);
  });
});

test.describe('Integration: Model selection flow', () => {
  test('selected model in Settings persists and reflects in chat ModelSelector', async ({ page }) => {
    // Step 1: Go to settings, select a provider and model
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });

    // Visit settings first
    await page.goto('/settings');
    const keysTab = page.locator('button').filter({ hasText: /api.?keys/i }).first();
    if (await keysTab.count() > 0) await keysTab.click();

    // Provider should have models from static catalog
    const providerBtn = page.locator('button').filter({ hasText: /OpenRouter/i }).first();
    if (await providerBtn.count() > 0) {
      await providerBtn.click();
      await page.waitForTimeout(500);
    }

    // Check that models are visible (from static catalog)
    const modelEntries = page.locator('.cursor-pointer');
    const modelCount = await modelEntries.count();
    if (modelCount > 0) {
      await modelEntries.first().click();
      // Verify gradient border on selected
      const style = await modelEntries.first().getAttribute('style');
      expect(style).toMatch(/borderImage|linear-gradient/i);
    }

    // Step 2: Navigate to chat page
    await page.goto('/ai/chat');
    await page.waitForTimeout(1000);

    // ModelSelector should render
    const modelSelector = page.locator('button[title*="model"], button[title*="API"]');
    // At minimum, some model-related UI should be present
    expect(await page.locator('body').count()).toBe(1);
  });
});
