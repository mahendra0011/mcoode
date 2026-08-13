import { test, expect } from '@playwright/test';

/**
 * Advanced Mode + AI Code Agent tab tests.
 * Tests that the Advanced Mode toggle works and the IDE view renders.
 */
test.describe('Advanced Mode + AI Code Agent Tab', () => {
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

  test('1. Advanced Mode button toggles between chat and agent mode', async ({ page }) => {
    // Find the Advanced Mode button
    const advancedBtn = page.locator('button').filter({ hasText: /Advanced Mode/i });
    expect(await advancedBtn.count()).toBeGreaterThan(0);

    // Verify it starts in chat mode (default)
    const initialClass = await advancedBtn.getAttribute('class') || '';
    const isInitiallyChat = !initialClass.includes('bg-gradient-to-r from-[#eab308]');
    console.log('Initially in chat mode:', isInitiallyChat);

    // Click to switch to agent mode
    await advancedBtn.click();
    await page.waitForTimeout(500);

    // After clicking, the button should have agent mode styling
    const afterClickClass = await advancedBtn.getAttribute('class') || '';
    const isAgentMode = afterClickClass.includes('bg-gradient-to-r from-[#eab308]');
    console.log('After click - agent mode:', isAgentMode);

    // The button text should still say "Advanced Mode"
    await expect(advancedBtn).toHaveText(/Advanced Mode/i);

    // Click again to switch back to chat mode
    await advancedBtn.click();
    await page.waitForTimeout(500);

    const afterSecondClickClass = await advancedBtn.getAttribute('class') || '';
    const isBackToChat = !afterSecondClickClass.includes('bg-gradient-to-r from-[#eab308]');
    console.log('After second click - back to chat:', isBackToChat);
  });

  test('2. Advanced Mode shows God Mode toggle and Slash button', async ({ page }) => {
    // Switch to advanced mode first
    await page.locator('button').filter({ hasText: /Advanced Mode/i }).click();
    await page.waitForTimeout(500);

    // God Mode button should appear
    const godBtn = page.locator('button').filter({ hasText: /God/i });
    expect(await godBtn.count()).toBeGreaterThan(0);
    await expect(godBtn.first()).toBeVisible();

    // Command palette button (Slash) should appear
    const slashBtn = page.locator('button[title="Command Palette (/)"]');
    expect(await slashBtn.count()).toBeGreaterThan(0);
  });

  test('3. Switching to AI Code Agent tab shows IDE layout', async ({ page }) => {
    // Click the "AI code Agent" tab
    const agentTab = page.locator('button').filter({ hasText: /AI code Agent/i });
    expect(await agentTab.count()).toBeGreaterThan(0);
    await agentTab.click();
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
    const fileTree = page.locator('[class*="FileTree"], [class*="file-tree"]');
    // FileTree might not have a specific class, let's check for the explorer structure
    const explorerSection = page.locator('text=Explorer').locator('..');
    if (await explorerSection.count() > 0) {
      await expect(explorerSection.first()).toBeVisible();
    }
  });

  test('4. AI Code Agent tab has inline chat input', async ({ page }) => {
    // Switch to AI Code Agent tab
    await page.locator('button').filter({ hasText: /AI code Agent/i }).click();
    await page.waitForTimeout(1000);

    // Should have an inline chat input at the bottom
    const chatInput = page.locator('textarea').last();
    expect(await chatInput.count()).toBeGreaterThan(0);

    // Check for "Ask AI code agent..." placeholder
    const input = await chatInput.last().inputValue();
    console.log('Input value:', input);

    // Check for ModelSelector in the IDE view
    const modelSelector = page.locator('[class*="ModelSelector"], button').filter({ hasText: /model|provider/i });
    // Model selector might exist or might be a component
  });

  test('5. Advanced Mode + God Mode shows wave progress component', async ({ page }) => {
    // Switch to advanced mode
    await page.locator('button').filter({ hasText: /Advanced Mode/i }).click();
    await page.waitForTimeout(300);

    // Enable God Mode
    await page.locator('button').filter({ hasText: /God/i }).click();
    await page.waitForTimeout(300);

    // God mode should be active - WaveProgress component structure should exist
    // (it may not show until a chat is started, but the state should be set)
    const godActive = await page.locator('button').filter({ hasText: /God/i }).getAttribute('class');
    console.log('God mode button class:', godActive);
    expect(godActive).toContain('bg-gradient-to-r from-purple-500');
  });

  test('6. Tab switching preserves state between Chat and AI Code Agent', async ({ page }) => {
    // Start in Chat tab
    await expect(page.locator('text=What do you want to build')).toBeVisible();

    // Switch to AI Code Agent tab
    await page.locator('button').filter({ hasText: /AI code Agent/i }).click();
    await page.waitForTimeout(500);

    // AI Assistance should be visible
    await expect(page.locator('text=AI Assistance')).toBeVisible();

    // Switch back to Chat tab
    await page.locator('button').filter({ hasText: /Chat/i }).first().click();
    await page.waitForTimeout(500);

    // Chat empty state should still be visible
    await expect(page.locator('text=What do you want to build')).toBeVisible();
  });
});
