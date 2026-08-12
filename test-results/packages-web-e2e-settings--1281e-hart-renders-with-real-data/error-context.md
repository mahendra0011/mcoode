# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\web\e2e\settings-models.spec.js >> Settings → Usage stats (UsageTab) >> tokens per day bar chart renders with real data
- Location: packages\web\e2e\settings-models.spec.js:209:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/settings", waiting until "load"

```

# Test source

```ts
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
  113 |     const promoBtn = page.locator('button').filter({ hasText: /Get Z\.ai|Z\.ai Pro|Z\.ai Beta/i });
  114 |     expect(await promoBtn.count()).toBe(0);
  115 |   });
  116 | 
  117 |   test('save button sends model field', async ({ page }) => {
  118 |     // Select a provider (providers already loaded in beforeEach)
  119 |     const providerBtn = page.locator('button').filter({ hasText: /OpenRouter|OpenAI|Anthropic/i });
  120 |     if (await providerBtn.count() > 0) {
  121 |       await providerBtn.first().click();
  122 |       // Wait for the content area to update after provider click
  123 |       await page.waitForTimeout(800);
  124 |     }
  125 |     // The Save button should be present
  126 |     const saveBtn = page.locator('button').filter({ hasText: /save/i });
  127 |     expect(await saveBtn.count()).toBeGreaterThan(0);
  128 |   });
  129 | 
  130 |   test('provider search filters the list', async ({ page }) => {
  131 |     const searchInput = page.locator('input[placeholder="Search providers..."]');
  132 |     await searchInput.fill('anthropic');
  133 |     await page.waitForTimeout(500);
  134 |     // After searching, only Anthropic-related providers should be visible
  135 |     // (or "None available" if no match)
  136 |   });
  137 | });
  138 | 
  139 | test.describe('Settings → Usage stats (UsageTab)', () => {
  140 |   test.beforeEach(async ({ page }) => {
  141 |     await page.addInitScript(() => {
  142 |       localStorage.setItem('mcode_tokens', JSON.stringify({
  143 |         access: 'fake-token-for-testing', refresh: 'fake-refresh'
  144 |       }));
  145 |     });
> 146 |     await page.goto('/settings');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  147 |     await page.waitForSelector('button', { timeout: 10000 });
  148 |     // Switch to Usage stats tab
  149 |     const usageTab = page.locator('button').filter({ hasText: /usage/i });
  150 |     if (await usageTab.count() > 0) await usageTab.first().click();
  151 |     // Wait for stats to load or grid to appear
  152 |     await page.waitForFunction(() => {
  153 |       return document.querySelector('.animate-spin') !== null ||
  154 |              document.querySelector('.grid.grid-cols-3') !== null;
  155 |     }, { timeout: 10000 });
  156 |     await page.waitForTimeout(500);
  157 |   });
  158 | 
  159 |   test('usage stats tab loads with real data (not mock)', async ({ page }) => {
  160 |     // Wait for the metrics grid to appear (indicates loading is done)
  161 |     await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
  162 |     // Mock data had hardcoded values like "821.2M", "56", "393"
  163 |     // Real data should not contain these exact values
  164 |     const mockValues = page.locator('text=821.2M');
  165 |     expect(await mockValues.count()).toBe(0);
  166 |   });
  167 | 
  168 |   test('usage stats shows loading state then data', async ({ page }) => {
  169 |     // With fake tokens, the fetch may resolve quickly. We verify either the
  170 |     // loading spinner appeared, or the grid appeared (or both in sequence).
  171 |     // Wait for either spinner or grid to be present
  172 |     await page.waitForFunction(() => {
  173 |       return document.querySelector('.animate-spin') !== null ||
  174 |              document.querySelector('.grid.grid-cols-3') !== null;
  175 |     }, { timeout: 5000 });
  176 |     // Wait for stats to load — the fetch may fail (fake token) but loading resolves to false
  177 |     await page.waitForFunction(() => {
  178 |       const grid = document.querySelector('.grid.grid-cols-3');
  179 |       return grid !== null;
  180 |     }, { timeout: 10000 });
  181 |     // After loading, metrics grid should be visible
  182 |     const metricsGrid = page.locator('.grid.grid-cols-3');
  183 |     expect(await metricsGrid.count()).toBeGreaterThan(0);
  184 |   });
  185 | 
  186 |   test('time range selector works', async ({ page }) => {
  187 |     // Wait for the usage tab to finish loading
  188 |     await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
  189 |     const rangeBtns = page.locator('button').filter({ hasText: /Last 7 days|Last 30 days/i });
  190 |     expect(await rangeBtns.count()).toBe(2);
  191 |     // Click "Last 7 days"
  192 |     const sevenBtn = page.locator('button').filter({ hasText: /Last 7 days/i }).first();
  193 |     if (await sevenBtn.count() > 0) {
  194 |       await sevenBtn.click();
  195 |       await page.waitForTimeout(1000);
  196 |     }
  197 |   });
  198 | 
  199 |   test('heatmap renders with real data', async ({ page }) => {
  200 |     // Wait for the usage tab to finish loading
  201 |     await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
  202 |     const heatmap = page.locator('text=Activity heatmap');
  203 |     expect(await heatmap.count()).toBeGreaterThan(0);
  204 |     // Should have square cells for days
  205 |     const dayCells = page.locator('div[class*="rounded-[3px]"]');
  206 |     expect(await dayCells.count()).toBeGreaterThan(10);
  207 |   });
  208 | 
  209 |   test('tokens per day bar chart renders with real data', async ({ page }) => {
  210 |     // Wait for the usage tab to finish loading
  211 |     await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
  212 |     const barChart = page.locator('text=Tokens per day');
  213 |     expect(await barChart.count()).toBeGreaterThan(0);
  214 |     // Bar chart should use motion.div elements (animated bars)
  215 |     const animatedBars = page.locator('div[style*="height"]');
  216 |     expect(await animatedBars.count()).toBeGreaterThan(0);
  217 |   });
  218 | 
  219 |   test('model usage donut chart renders with real data', async ({ page }) => {
  220 |     // Wait for the usage tab to finish loading
  221 |     await page.waitForFunction(() => document.querySelector('.grid.grid-cols-3') !== null, { timeout: 10000 });
  222 |     const donutChart = page.locator('text=Model usage');
  223 |     expect(await donutChart.count()).toBeGreaterThan(0);
  224 |     // Should have an SVG donut
  225 |     const svg = page.locator('svg[viewBox="0 0 100 100"]');
  226 |     expect(await svg.count()).toBeGreaterThan(0);
  227 |   });
  228 | });
  229 | 
```