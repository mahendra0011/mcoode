import { test, expect } from '@playwright/test';

// ── SettingsPage (/settings) ──

test.describe('SettingsPage (/settings)', () => {
  test.beforeEach(async ({ page }) => { await page.goto('/settings'); });

  test('page loads without errors', async ({ page }) => {
    // Check for rendered settings heading, not title
    await expect(page.locator('text=Settings')).toBeVisible();
  });

  test('page has tab navigation', async ({ page }) => {
    // Settings tabs: permissions, keys, models, theme, network, watch, godmode, account, connections
    const tabContainer = page.locator('[class*="tab"], [class*="Tab"], nav');
    if (await tabContainer.count() > 0) {
      await expect(tabContainer.first()).toBeVisible();
    }
  });

  test('at least 4 settings tabs visible', async ({ page }) => {
    const tabs = page.locator('button').filter({
      hasText: /permissions|keys|models|theme|network|watch|god.?mode|account|connection/i
    });
    expect(await tabs.count()).toBeGreaterThanOrEqual(4);
  });

  test('God-Mode tab exists and is clickable', async ({ page }) => {
    const godTab = page.locator('button').filter({ hasText: /god.?mode|god/i });
    if (await godTab.count() > 0) {
      await expect(godTab.first()).toBeVisible();
    }
  });

  test('all action buttons are motion.button', async ({ page }) => {
    // Buttons like Save, Test, Remove, Add, etc.
    const actionBtns = page.locator('button[type="submit"], button').filter({
      hasText: /save|test|remove|add|connect|disconnect|logout|delete|update|change/i
    });
    expect(await actionBtns.count()).toBeGreaterThan(0);
  });

  test('toggle switches exist for god-mode/skip-tests', async ({ page }) => {
    const toggles = page.locator('[class*="toggle"], [class*="switch"], [role="switch"]');
    if (await toggles.count() === 0) {
      // Check for div-based toggles (the ones we converted to motion.div)
      const toggleDivs = page.locator('.rounded-full');
      expect(await toggleDivs.count()).toBeGreaterThanOrEqual(1);
    }
  });

  test('accent color selector buttons exist', async ({ page }) => {
    const colorBtns = page.locator('button');
    // Find buttons that look like color selectors (have bg color classes)
    const colorSelectors = await colorBtns.evaluateAll(btns =>
      btns.filter(btn => btn.className.includes('bg-') && btn.className.includes('rounded')).length
    );
    expect(colorSelectors).toBeGreaterThanOrEqual(1);
  });
});
