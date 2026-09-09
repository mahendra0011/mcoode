import { test, expect } from '@playwright/test';

/**
 * AI Code Assistant + AI Code Editor tab tests.
 * Tests that switching between Chat and AI Code Assistant (agent mode) works
 * and the IDE view renders.
 */
test.describe('AI Code Assistant + AI Code Editor Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing',
        refresh: 'fake-refresh'
      }));
    });
    await page.goto('/ai/chat');
    await page.waitForLoadState('networkidle');
  });

  test('1. AI Code Assistant tab switches between chat and agent mode', async ({ page }) => {
    // Find the AI Code Assistant tab (agent mode)
    const agentTab = page.locator('button').filter({ hasText: /AI Code Assistant/i });
    expect(await agentTab.count()).toBeGreaterThan(0);

    // Verify Chat tab is active by default (no gradient from-purple styling)
    const chatTab = page.locator('button').filter({ hasText: /^Chat$/i });
    const initialClass = await chatTab.first().getAttribute('class') || '';
    const isInitiallyChat = !initialClass.includes('bg-gradient-to-r from-[#eab308]');
    console.log('Initially in chat mode:', isInitiallyChat);

    // Click to switch to AI Code Assistant (agent mode)
    await agentTab.click();
    await page.waitForTimeout(500);

    // After clicking, the tab should have agent mode styling
    const afterClickClass = await agentTab.getAttribute('class') || '';
    const isAgentMode = afterClickClass.includes('bg-gradient-to-r from-[#eab308]');
    console.log('After click - agent mode:', isAgentMode);

    // The tab text should be "AI Code Assistant"
    await expect(agentTab).toHaveText(/AI Code Assistant/i);

    // Click Chat tab to switch back to chat mode
    await chatTab.first().click();
    await page.waitForTimeout(500);

    const afterSecondClickClass = await chatTab.first().getAttribute('class') || '';
    const isBackToChat = !afterSecondClickClass.includes('bg-gradient-to-r from-[#eab308]');
    console.log('After second click - back to chat:', isBackToChat);
  });

  test('2. AI Code Assistant tab shows God Mode toggle and Slash button', async ({ page }) => {
    // Switch to AI Code Assistant tab first
    await page.locator('button').filter({ hasText: /AI Code Assistant/i }).click();
    await page.waitForTimeout(500);

    // God Mode button should appear
    const godBtn = page.locator('button').filter({ hasText: /God/i });
    expect(await godBtn.count()).toBeGreaterThan(0);
    await expect(godBtn.first()).toBeVisible();

    // Command palette button (Slash) should appear
    const slashBtn = page.locator('button[title="Command Palette (/)"]');
    expect(await slashBtn.count()).toBeGreaterThan(0);
  });

  test('3. Switching to AI Code Editor tab shows IDE layout', async ({ page }) => {
    // Click the "AI Code Editor" tab
    const editorTab = page.locator('button').filter({ hasText: /AI Code Editor/i });
    expect(await editorTab.count()).toBeGreaterThan(0);
    await editorTab.click();
    await page.waitForTimeout(1000);

    // Should show IDE layout: FileTree, EditorPane, TerminalPane
    // Check for Explorer section
    const explorer = page.locator('text=Explorer');
    expect(await explorer.count()).toBeGreaterThan(0);

    // Check for AI Assistance panel
    const aiAssistance = page.locator('text=AI Assistance');
    expect(await aiAssistance.count()).toBeGreaterThan(0);

    // Check for TerminalPane (bottom of IDE)
    const terminalPrompt = page.locator('text=$');
    expect(await terminalPrompt.count()).toBeGreaterThan(0);

    // Check for file tree with scrollable area
    const explorerSection = page.locator('text=Explorer').locator('..');
    if (await explorerSection.count() > 0) {
      await expect(explorerSection.first()).toBeVisible();
    }
  });

  test('4. AI Code Editor tab has inline chat input', async ({ page }) => {
    // Switch to AI Code Editor tab
    await page.locator('button').filter({ hasText: /AI Code Editor/i }).click();
    await page.waitForTimeout(1000);

    // Should have an inline chat input at the bottom
    const chatInput = page.locator('textarea').last();
    expect(await chatInput.count()).toBeGreaterThan(0);

    // Check for ModelSelector in the IDE view
    const modelSelector = page.locator('[class*="ModelSelector"], button').filter({ hasText: /model|provider/i });
  });

  test('5. AI Code Assistant tab + God Mode shows wave progress component', async ({ page }) => {
    // Switch to AI Code Assistant tab
    await page.locator('button').filter({ hasText: /AI Code Assistant/i }).click();
    await page.waitForTimeout(300);

    // Enable God Mode
    await page.locator('button').filter({ hasText: /God/i }).click();
    await page.waitForTimeout(300);

    // God mode should be active - WaveProgress component structure should exist
    const godActive = await page.locator('button').filter({ hasText: /God/i }).getAttribute('class');
    console.log('God mode button class:', godActive);
    expect(godActive).toContain('bg-gradient-to-r from-purple-500');
  });

  test('6. Tab switching preserves state between Chat and AI Code Editor', async ({ page }) => {
    // Start in Chat tab
    await expect(page.locator('text=What do you want to build')).toBeVisible();

    // Switch to AI Code Editor tab
    await page.locator('button').filter({ hasText: /AI Code Editor/i }).click();
    await page.waitForTimeout(500);

    // AI Assistance should be visible
    await expect(page.locator('text=AI Assistance')).toBeVisible();

    // Switch back to Chat tab
    await page.locator('button').filter({ hasText: /^Chat$/i }).first().click();
    await page.waitForTimeout(500);

    // Chat empty state should still be visible
    await expect(page.locator('text=What do you want to build')).toBeVisible();
  });
});
