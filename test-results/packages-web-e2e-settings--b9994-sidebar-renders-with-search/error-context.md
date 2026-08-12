# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\web\e2e\settings-models.spec.js >> Settings → Model settings (ApiKeysTab) >> providers sidebar renders with search
- Location: packages\web\e2e\settings-models.spec.js:26:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/settings", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // ── SettingsPage → Model selection + Usage stats ──
  4   | 
  5   | test.describe('Settings → Model settings (ApiKeysTab)', () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.addInitScript(() => {
  8   |       localStorage.setItem('mcode_tokens', JSON.stringify({
  9   |         access: 'fake-token-for-testing', refresh: 'fake-refresh'
  10  |       }));
  11  |     });
> 12  |     await page.goto('/settings');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  13  |     await page.waitForSelector('button', { timeout: 10000 });
  14  |     // Switch to the API Keys tab
  15  |     const keysTab = page.locator('button').filter({ hasText: /api.?keys/i });
  16  |     if (await keysTab.count() > 0) await keysTab.first().click();
  17  |     // Wait for providers to load — sidebar spinner disappears and provider labels appear
  18  |     await page.waitForFunction(() => {
  19  |       const spinner = document.querySelector('.animate-spin');
  20  |       const text = document.body.textContent || '';
  21  |       return spinner === null || text.includes('Available providers') || text.includes('Configured providers');
  22  |     }, { timeout: 10000 });
  23  |     await page.waitForTimeout(500);
  24  |   });
  25  | 
  26  |   test('providers sidebar renders with search', async ({ page }) => {
  27  |     const searchInput = page.locator('input[placeholder="Search providers..."]');
  28  |     await expect(searchInput).toBeVisible();
  29  |   });
  30  | 
  31  |   test('all providers have models available from static catalog', async ({ page }) => {
  32  |     // Click on a provider that hasn't been configured (no API key saved)
  33  |     // Models should still be visible from the static catalog
  34  |     const providerBtn = page.locator('button').filter({ hasText: /OpenRouter|OpenAI|Anthropic|Google/i });
  35  |     if (await providerBtn.count() > 0) {
  36  |       await providerBtn.first().click();
  37  |       await page.waitForTimeout(800);
  38  |     }
  39  |     // The model list area should show models (not "No models available")
  40  |     const noModelsMsg = page.locator('text=No models available');
  41  |     const hasModels = await noModelsMsg.count() === 0;
  42  |     // Either no "no models" message (good) or content exists
  43  |     const modelArea = page.locator('text=/Available models|model/i');
  44  |     expect(await modelArea.count()).toBeGreaterThan(0);
  45  |   });
  46  | 
  47  |   test('model selection with gradient border', async ({ page }) => {
  48  |     // Select a provider
  49  |     const providerBtn = page.locator('button').filter({ hasText: /OpenRouter|OpenAI|Anthropic/i });
  50  |     if (await providerBtn.count() > 0) {
  51  |       await providerBtn.first().click();
  52  |       await page.waitForTimeout(800);
  53  |     }
  54  |     // Find a model entry that is clickable
  55  |     const modelEntries = page.locator('.cursor-pointer');
  56  |     const count = await modelEntries.count();
  57  |     if (count > 0) {
  58  |       // Click the first model
  59  |       await modelEntries.first().click();
  60  |       // After clicking, the selected model should have a gradient border
  61  |       // (borderImage style is set via inline style)
  62  |       const selectedEntry = modelEntries.first();
  63  |       const style = await selectedEntry.getAttribute('style');
  64  |       // Gradient border uses borderImage
  65  |       expect(style).toMatch(/borderImage|linear-gradient/i);
  66  |     }
  67  |   });
  68  | 
  69  |   test('model selection persists across provider switches', async ({ page }) => {
  70  |     // Select provider A (providers already loaded in beforeEach)
  71  |     const providerA = page.locator('button').filter({ hasText: /OpenRouter|OpenAI/i }).first();
  72  |     await providerA.click();
  73  |     await page.waitForTimeout(800);
  74  | 
  75  |     // Select a model
  76  |     const modelEntries = page.locator('.cursor-pointer');
  77  |     const modelCount = await modelEntries.count();
  78  |     if (modelCount > 0) {
  79  |       await modelEntries.first().click();
  80  |       const selectedModelText = await modelEntries.first().textContent();
  81  | 
  82  |       // Switch to provider B
  83  |       const providerB = page.locator('button').filter({ hasText: /Anthropic|Google/i }).first();
  84  |       if (await providerB.count() > 0) {
  85  |         await providerB.click();
  86  |         await page.waitForTimeout(500);
  87  |       }
  88  | 
  89  |       // Switch back to provider A
  90  |       await providerA.click();
  91  |       await page.waitForTimeout(500);
  92  | 
  93  |       // The selected model should still be highlighted
  94  |       const stillSelected = page.locator('.cursor-pointer').first();
  95  |       const style = await stillSelected.getAttribute('style');
  96  |       expect(style).toMatch(/borderImage|linear-gradient/i);
  97  |     }
  98  |   });
  99  | 
  100 |   test('no hardcoded Z.ai promotion button in sidebar', async ({ page }) => {
  101 |     // Z.AI is a legitimate provider — it should appear in the provider list, not
  102 |     // as a standalone promotion button. Check that any "Z.AI" button is inside
  103 |     // the provider list (has text like "Available providers" nearby), not a
  104 |     // separate promotion element outside the list.
  105 |     const zaiBtn = page.locator('button').filter({ hasText: /^Z\.AI$/ });
  106 |     // If a Z.AI button exists, verify it's a provider (in the list, not a promo)
  107 |     if (await zaiBtn.count() > 0) {
  108 |       // Provider buttons have a green/red status dot and are in the sidebar list
  109 |       const providerList = page.locator('text=Available providers');
  110 |       expect(await providerList.count()).toBeGreaterThan(0);
  111 |     }
  112 |     // No standalone Z.ai promotion button (e.g., "Get Z.ai" or "Z.ai Pro")
```