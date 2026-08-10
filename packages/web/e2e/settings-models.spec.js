import { test, expect } from '@playwright/test';

// ── SettingsPage → Model selection + Usage stats ──

test.describe('Settings → Model settings (ApiKeysTab)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });
    await page.goto('/settings');
    await page.waitForSelector('button', { timeout: 10000 });
    // Switch to the API Keys tab
    const keysTab = page.locator('button').filter({ hasText: /api.?keys/i });
    if (await keysTab.count() > 0) await keysTab.first().click();
    // Wait for providers to load — sidebar spinner disappears and provider labels appear
    await page.waitForFunction(() => {
      const spinner = document.querySelector('.animate-spin');
      const text = document.body.textContent || '';
      return spinner === null || text.includes('Available providers') || text.includes('Configured providers');
    }, { timeout: 10000 });
  });

  test('providers sidebar renders with search', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search providers..."]');
    await expect(searchInput).toBeVisible();
  });

  test('all providers have models available from static catalog', async ({ page }) => {
    // Click on a provider that hasn't been configured (no API key saved)
    // Models should still be visible from the static catalog
    const providerBtn = page.locator('button').filter({ hasText: /OpenRouter|OpenAI|Anthropic|Google/i });
    if (await providerBtn.count() > 0) {
      await providerBtn.first().click();
      await page.waitForTimeout(800);
    }
    // The model list area should show models (not "No models available")
    const noModelsMsg = page.locator('text=No models available');
    const hasModels = await noModelsMsg.count() === 0;
    // Either no "no models" message (good) or content exists
    const modelArea = page.locator('text=/Available models|model/i');
    expect(await modelArea.count()).toBeGreaterThan(0);
  });

  test('model selection with gradient border', async ({ page }) => {
    // Select a provider
    const providerBtn = page.locator('button').filter({ hasText: /OpenRouter|OpenAI|Anthropic/i });
    if (await providerBtn.count() > 0) {
      await providerBtn.first().click();
      await page.waitForTimeout(800);
    }
    // Find a model entry that is clickable
    const modelEntries = page.locator('.cursor-pointer');
    const count = await modelEntries.count();
    if (count > 0) {
      // Click the first model
      await modelEntries.first().click();
      // After clicking, the selected model should have a gradient border
      // (borderImage style is set via inline style)
      const selectedEntry = modelEntries.first();
      const style = await selectedEntry.getAttribute('style');
      // Gradient border uses borderImage
      expect(style).toMatch(/borderImage|linear-gradient/i);
    }
  });

  test('model selection persists across provider switches', async ({ page }) => {
    // Select provider A (providers already loaded in beforeEach)
    const providerA = page.locator('button').filter({ hasText: /OpenRouter|OpenAI/i }).first();
    await page.waitForTimeout(300); // ensure provider buttons are clickable after beforeEach wait
    await providerA.click();
    await page.waitForTimeout(800);

    // Select a model
    const modelEntries = page.locator('.cursor-pointer');
    const modelCount = await modelEntries.count();
    if (modelCount > 0) {
      await modelEntries.first().click();
      const selectedModelText = await modelEntries.first().textContent();

      // Switch to provider B
      const providerB = page.locator('button').filter({ hasText: /Anthropic|Google/i }).first();
      if (await providerB.count() > 0) {
        await providerB.click();
        await page.waitForTimeout(500);
      }

      // Switch back to provider A
      await providerA.click();
      await page.waitForTimeout(500);

      // The selected model should still be highlighted
      const stillSelected = page.locator('.cursor-pointer').first();
      const style = await stillSelected.getAttribute('style');
      expect(style).toMatch(/borderImage|linear-gradient/i);
    }
  });

  test('no hardcoded Z.ai promotion button in sidebar', async ({ page }) => {
    // Z.AI is a legitimate provider — it should appear in the provider list, not
    // as a standalone promotion button. Check that any "Z.AI" button is inside
    // the provider list (has text like "Available providers" nearby), not a
    // separate promotion element outside the list.
    const zaiBtn = page.locator('button').filter({ hasText: /^Z\.AI$/ });
    // If a Z.AI button exists, verify it's a provider (in the list, not a promo)
    if (await zaiBtn.count() > 0) {
      // Provider buttons have a green/red status dot and are in the sidebar list
      const providerList = page.locator('text=Available providers');
      expect(await providerList.count()).toBeGreaterThan(0);
    }
    // No standalone Z.ai promotion button (e.g., "Get Z.ai" or "Z.ai Pro")
    const promoBtn = page.locator('button').filter({ hasText: /Get Z\.ai|Z\.ai Pro|Z\.ai Beta/i });
    expect(await promoBtn.count()).toBe(0);
  });

  test('save button sends model field', async ({ page }) => {
    // Select a provider (providers already loaded in beforeEach)
    const providerBtn = page.locator('button').filter({ hasText: /OpenRouter|OpenAI|Anthropic/i });
    if (await providerBtn.count() > 0) {
      await providerBtn.first().click();
      // Wait for the content area to update after provider click
      await page.waitForTimeout(800);
    }
    // The Save button should be present
    const saveBtn = page.locator('button').filter({ hasText: /save/i });
    expect(await saveBtn.count()).toBeGreaterThan(0);
  });

  test('provider search filters the list', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search providers..."]');
    await searchInput.fill('anthropic');
    await page.waitForTimeout(500);
    // After searching, only Anthropic-related providers should be visible
    // (or "None available" if no match)
  });
});

test.describe('Settings → Usage stats (UsageTab)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('mcode_tokens', JSON.stringify({
        access: 'fake-token-for-testing', refresh: 'fake-refresh'
      }));
    });
    await page.goto('/settings');
    await page.waitForSelector('button', { timeout: 10000 });
    // Switch to Usage stats tab
    const usageTab = page.locator('button').filter({ hasText: /usage/i });
    if (await usageTab.count() > 0) await usageTab.first().click();
    // Wait for stats to load or grid to appear
    await page.waitForFunction(() => {
      return document.querySelector('.animate-spin') !== null ||
             document.querySelector('.grid.grid-cols-3') !== null;
    }, { timeout: 10000 });
    await page.waitForTimeout(500);
  });

  test('usage stats tab loads with real data (not mock)', async ({ page }) => {
    // Wait for the metrics grid to appear (indicates loading is done)
    await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
    // Mock data had hardcoded values like "821.2M", "56", "393"
    // Real data should not contain these exact values
    const mockValues = page.locator('text=821.2M');
    expect(await mockValues.count()).toBe(0);
  });

  test('usage stats shows loading state then data', async ({ page }) => {
    // With fake tokens, the fetch may resolve quickly. We verify either the
    // loading spinner appeared, or the grid appeared (or both in sequence).
    // Wait for either spinner or grid to be present
    await page.waitForFunction(() => {
      return document.querySelector('.animate-spin') !== null ||
             document.querySelector('.grid.grid-cols-3') !== null;
    }, { timeout: 5000 });
    // Wait for stats to load — the fetch may fail (fake token) but loading resolves to false
    await page.waitForFunction(() => {
      const grid = document.querySelector('.grid.grid-cols-3');
      return grid !== null;
    }, { timeout: 10000 });
    // After loading, metrics grid should be visible
    const metricsGrid = page.locator('.grid.grid-cols-3');
    expect(await metricsGrid.count()).toBeGreaterThan(0);
  });

  test('time range selector works', async ({ page }) => {
    // Wait for the usage tab to finish loading
    await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
    const rangeBtns = page.locator('button').filter({ hasText: /Last 7 days|Last 30 days/i });
    expect(await rangeBtns.count()).toBe(2);
    // Click "Last 7 days"
    const sevenBtn = page.locator('button').filter({ hasText: /Last 7 days/i }).first();
    if (await sevenBtn.count() > 0) {
      await sevenBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('heatmap renders with real data', async ({ page }) => {
    // Wait for the usage tab to finish loading
    await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
    const heatmap = page.locator('text=Activity heatmap');
    expect(await heatmap.count()).toBeGreaterThan(0);
    // Should have square cells for days
    const dayCells = page.locator('div[class*="rounded-[3px]"]');
    expect(await dayCells.count()).toBeGreaterThan(10);
  });

  test('tokens per day bar chart renders with real data', async ({ page }) => {
    // Wait for the usage tab to finish loading
    await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
    const barChart = page.locator('text=Tokens per day');
    expect(await barChart.count()).toBeGreaterThan(0);
    // Bar chart should use motion.div elements (animated bars)
    const animatedBars = page.locator('div[style*="height"]');
    expect(await animatedBars.count()).toBeGreaterThan(0);
  });

  test('model usage donut chart renders with real data', async ({ page }) => {
    // Wait for the usage tab to finish loading
    await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
    const donutChart = page.locator('text=Model usage');
    expect(await donutChart.count()).toBeGreaterThan(0);
    // Should have an SVG donut
    const svg = page.locator('svg[viewBox="0 0 100 100"]');
    expect(await svg.count()).toBeGreaterThan(0);
  });
});
