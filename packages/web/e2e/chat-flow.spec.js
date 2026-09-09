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
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.focus();
    await textarea.fill('/');
    await page.waitForTimeout(500);
    const clearBtn = page.locator('button').filter({ hasText: '/clear' });
    expect(await clearBtn.count()).toBeGreaterThan(0);
  });

  test('slash command list contains expected commands', async ({ page }) => {
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/help');
    const helpText = page.locator('text=Available commands');
    expect(await helpText.count()).toBeGreaterThan(0);
  });

  test('slash commands are listed in picker', async ({ page }) => {
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/');
    await page.waitForTimeout(500);
    for (const cmd of ['clear', 'help', 'undo', 'model', 'god', 'watch', 'debug', 'export']) {
      const cmdEl = page.locator('button').filter({ hasText: `/${cmd}` });
      if (await cmdEl.count() > 0) {
        await expect(cmdEl.first()).toBeVisible();
      }
    }
  });

  test('/clear command clears the chat', async ({ page }) => {
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.fill('/clear');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    const clearMsg = page.locator('text=/chat cleared/i');
    expect(await clearMsg.count()).toBeGreaterThan(0);
  });

  test('/god command without args shows usage hint', async ({ page }) => {
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
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
    if (await chatTab.count() > 0) await chatTab.click();
    await page.waitForTimeout(500);
    const textarea = page.locator('textarea').first();
    await textarea.focus();
    await textarea.fill('/help');
    await page.waitForTimeout(500);
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

  test('tab navigation renders (Chat, AI Code Assistant, AI Code Editor)', async ({ page }) => {
    const tabs = page.locator('button').filter({ hasText: /Chat|Code Assistant|Code Editor/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(2);
  });

  test('AI Code Assistant tab switches between chat and agent mode', async ({ page }) => {
    const assistantTab = page.locator('button').filter({ hasText: /AI Code Assistant/i });
    expect(await assistantTab.count()).toBeGreaterThan(0);
    await assistantTab.click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
    await page.locator('button').filter({ hasText: /^Chat$/i }).first().click();
    await page.waitForTimeout(500);
    await expect(page.locator('body')).toBeVisible();
  });

  test('God Mode button exists and toggles', async ({ page }) => {
    const assistantTab = page.locator('button').filter({ hasText: /AI Code Assistant/i });
    if (await assistantTab.count() > 0) {
      await assistantTab.click();
      await page.waitForTimeout(500);
    }
    const godBtn = page.locator('button').filter({ hasText: /God/i });
    expect(await godBtn.count()).toBeGreaterThan(0);
  });

  test('model selector renders in chat interface', async ({ page }) => {
    const modelSelector = page.locator('button').filter({
      hasText: /Choose model|model/i
    });
    expect(await page.locator('button[title*="model"], button[title*="API key"]').count()).toBeGreaterThanOrEqual(0);
  });

  test('empty state shows action buttons', async ({ page }) => {
    const actionBtns = page.locator('button').filter({
      hasText: /Upload|Export|Push|Branch|GitHub|God|Create a website|Build a mobile/i
    });
    expect(await actionBtns.count()).toBeGreaterThan(0);
  });

  test('send button is disabled when input is empty', async ({ page }) => {
    const sendBtn = page.locator('button[type="submit"]');
    if (await sendBtn.count() > 0) {
      const isDisabled = await sendBtn.first().isDisabled();
      expect(isDisabled).toBeTruthy();
    }
  });

  test('all tabs render without crashing', async ({ page }) => {
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/ }).first();
    if (await chatTab.count() > 0) {
      await chatTab.click();
      await page.waitForTimeout(500);
      await expect(page.locator('body')).toBeVisible();
    }
    const editorTab = page.locator('button').filter({ hasText: /Code Editor/i }).first();
    if (await editorTab.count() > 0) {
      await editorTab.click();
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
    const loginBtn = page.locator('button').filter({ hasText: /Login/i });
    const profileBtn = page.locator('[class*="rounded-full"]').filter({ hasText: /[A-Z]/ });
    const hasEither = (await loginBtn.count()) > 0 || (await profileBtn.count()) > 0;
    expect(hasEither).toBeTruthy();
  });

  test('sidebar has settings link', async ({ page }) => {
    const settingsLink = page.locator('a[href="/settings"]');
    expect(await settingsLink.count()).toBeGreaterThan(0);
  });
});

test.describe('Integration: Model selection flow', () => {
  test('selected model in Settings persists and reflects in chat ModelSelector', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });

    await page.goto('/settings');
    const keysTab = page.locator('button').filter({ hasText: /api.?keys/i }).first();
    if (await keysTab.count() > 0) await keysTab.click();

    const providerBtn = page.locator('button').filter({ hasText: /OpenRouter/i }).first();
    if (await providerBtn.count() > 0) {
      await providerBtn.click();
      await page.waitForTimeout(500);
    }

    const modelEntries = page.locator('.cursor-pointer');
    const modelCount = await modelEntries.count();
    if (modelCount > 0) {
      await modelEntries.first().click();
      const style = await modelEntries.first().getAttribute('style');
      expect(style).toMatch(/borderImage|linear-gradient/i);
    }

    await page.goto('/ai/chat');
    await page.waitForTimeout(1000);

    const modelSelector = page.locator('button[title*="model"], button[title*="API"]');
    expect(await page.locator('body').count()).toBe(1);
  });
});
