# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\web\e2e\chat-flow.spec.js >> AIChatPage → Sidebar >> sidebar has settings link
- Location: packages\web\e2e\chat-flow.spec.js:221:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/ai/chat", waiting until "load"

```

# Test source

```ts
  100 |   });
  101 | });
  102 | 
  103 | test.describe('AIChatPage → Mode Switching', () => {
  104 |   test.beforeEach(async ({ page }) => {
  105 |     await page.addInitScript(() => {
  106 |       localStorage.setItem('mcode_tokens', JSON.stringify({
  107 |         access: 'fake-token-for-testing', refresh: 'fake-refresh'
  108 |       }));
  109 |     });
  110 |     await page.goto('/ai/chat');
  111 |   });
  112 | 
  113 |   test('tab navigation renders (Design, Chat, AI Code Agent)', async ({ page }) => {
  114 |     const tabs = page.locator('button').filter({ hasText: /Design|Chat|Code/i });
  115 |     const tabCount = await tabs.count();
  116 |     expect(tabCount).toBeGreaterThanOrEqual(2);
  117 |   });
  118 | 
  119 |   test('Advanced Mode toggle switches between chat and agent mode', async ({ page }) => {
  120 |     const advancedBtn = page.locator('button').filter({ hasText: /Advanced Mode/i });
  121 |     expect(await advancedBtn.count()).toBeGreaterThan(0);
  122 |     await advancedBtn.click();
  123 |     await page.waitForTimeout(500);
  124 |     // Page should still be visible after mode toggle
  125 |     await expect(page.locator('body')).toBeVisible();
  126 |     // Toggle back
  127 |     await advancedBtn.click();
  128 |     await page.waitForTimeout(500);
  129 |     await expect(page.locator('body')).toBeVisible();
  130 |   });
  131 | 
  132 |   test('God Mode button exists and toggles', async ({ page }) => {
  133 |     // First enable advanced mode to see god mode button
  134 |     const advancedBtn = page.locator('button').filter({ hasText: /Advanced Mode/i });
  135 |     if (await advancedBtn.count() > 0) {
  136 |       await advancedBtn.click();
  137 |       await page.waitForTimeout(500);
  138 |     }
  139 |     const godBtn = page.locator('button').filter({ hasText: /God/i });
  140 |     expect(await godBtn.count()).toBeGreaterThan(0);
  141 |   });
  142 | 
  143 |   test('model selector renders in chat interface', async ({ page }) => {
  144 |     const modelSelector = page.locator('button').filter({
  145 |       hasText: /Choose model|model/i
  146 |     });
  147 |     // ModelSelector should be present (possibly showing "Choose model" or a model name)
  148 |     expect(await page.locator('button[title*="model"], button[title*="API key"]').count()).toBeGreaterThanOrEqual(0);
  149 |   });
  150 | 
  151 |   test('empty state shows action buttons', async ({ page }) => {
  152 |     // In the empty state (no messages), action buttons should be visible
  153 |     const actionBtns = page.locator('button').filter({
  154 |       hasText: /Upload|Export|Push|Branch|GitHub|Advanced|God|Create a website|Build a mobile|Design a dashboard/i
  155 |     });
  156 |     expect(await actionBtns.count()).toBeGreaterThan(0);
  157 |   });
  158 | 
  159 |   test('send button is disabled when input is empty', async ({ page }) => {
  160 |     const sendBtn = page.locator('button[type="submit"]');
  161 |     if (await sendBtn.count() > 0) {
  162 |       // Send button should be disabled when no text is entered
  163 |       const isDisabled = await sendBtn.first().isDisabled();
  164 |       expect(isDisabled).toBeTruthy();
  165 |     }
  166 |   });
  167 | 
  168 |   test('all tabs render without crashing', async ({ page }) => {
  169 |     // Test Design tab
  170 |     const designTab = page.locator('button').filter({ hasText: /Design/i }).first();
  171 |     if (await designTab.count() > 0) {
  172 |       await designTab.click();
  173 |       await page.waitForTimeout(500);
  174 |       await expect(page.locator('body')).toBeVisible();
  175 |     }
  176 |     // Test Chat tab
  177 |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ }).first();
  178 |     if (await chatTab.count() > 0) {
  179 |       await chatTab.click();
  180 |       await page.waitForTimeout(500);
  181 |       await expect(page.locator('body')).toBeVisible();
  182 |     }
  183 |     // Test AI Code Agent tab
  184 |     const agentTab = page.locator('button').filter({ hasText: /Code/i }).first();
  185 |     if (await agentTab.count() > 0) {
  186 |       await agentTab.click();
  187 |       await page.waitForTimeout(500);
  188 |       await expect(page.locator('body')).toBeVisible();
  189 |     }
  190 |   });
  191 | });
  192 | 
  193 | test.describe('AIChatPage → Sidebar', () => {
  194 |   test.beforeEach(async ({ page }) => {
  195 |     await page.addInitScript(() => {
  196 |       localStorage.setItem('mcode_tokens', JSON.stringify({
  197 |         access: 'fake-token-for-testing', refresh: 'fake-refresh'
  198 |       }));
  199 |     });
> 200 |     await page.goto('/ai/chat');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  201 |   });
  202 | 
  203 |   test('sidebar renders with M CODE brand', async ({ page }) => {
  204 |     const brand = page.locator('text=/M CODE|mcode/i');
  205 |     expect(await brand.count()).toBeGreaterThan(0);
  206 |   });
  207 | 
  208 |   test('sidebar has new chat button', async ({ page }) => {
  209 |     const newChatBtn = page.locator('button').filter({ hasText: /New Chat/i });
  210 |     expect(await newChatBtn.count()).toBeGreaterThan(0);
  211 |   });
  212 | 
  213 |   test('sidebar has profile or login button', async ({ page }) => {
  214 |     // With fake token, /api/auth/me will fail, so Login button should show
  215 |     const loginBtn = page.locator('button').filter({ hasText: /Login/i });
  216 |     const profileBtn = page.locator('[class*="rounded-full"]').filter({ hasText: /[A-Z]/ });
  217 |     const hasEither = (await loginBtn.count()) > 0 || (await profileBtn.count()) > 0;
  218 |     expect(hasEither).toBeTruthy();
  219 |   });
  220 | 
  221 |   test('sidebar has settings link', async ({ page }) => {
  222 |     // Settings link in sidebar renders as <Link to="/settings"> with icon only (no text)
  223 |     const settingsLink = page.locator('a[href="/settings"]');
  224 |     expect(await settingsLink.count()).toBeGreaterThan(0);
  225 |   });
  226 | });
  227 | 
  228 | test.describe('Integration: Model selection flow', () => {
  229 |   test('selected model in Settings persists and reflects in chat ModelSelector', async ({ page }) => {
  230 |     // Step 1: Go to settings, select a provider and model
  231 |     await page.addInitScript(() => {
  232 |       localStorage.setItem('mcode_tokens', JSON.stringify({
  233 |         access: 'fake-token-for-testing', refresh: 'fake-refresh'
  234 |       }));
  235 |     });
  236 | 
  237 |     // Visit settings first
  238 |     await page.goto('/settings');
  239 |     const keysTab = page.locator('button').filter({ hasText: /api.?keys/i }).first();
  240 |     if (await keysTab.count() > 0) await keysTab.click();
  241 | 
  242 |     // Provider should have models from static catalog
  243 |     const providerBtn = page.locator('button').filter({ hasText: /OpenRouter/i }).first();
  244 |     if (await providerBtn.count() > 0) {
  245 |       await providerBtn.click();
  246 |       await page.waitForTimeout(500);
  247 |     }
  248 | 
  249 |     // Check that models are visible (from static catalog)
  250 |     const modelEntries = page.locator('.cursor-pointer');
  251 |     const modelCount = await modelEntries.count();
  252 |     if (modelCount > 0) {
  253 |       await modelEntries.first().click();
  254 |       // Verify gradient border on selected
  255 |       const style = await modelEntries.first().getAttribute('style');
  256 |       expect(style).toMatch(/borderImage|linear-gradient/i);
  257 |     }
  258 | 
  259 |     // Step 2: Navigate to chat page
  260 |     await page.goto('/ai/chat');
  261 |     await page.waitForTimeout(1000);
  262 | 
  263 |     // ModelSelector should render
  264 |     const modelSelector = page.locator('button[title*="model"], button[title*="API"]');
  265 |     // At minimum, some model-related UI should be present
  266 |     expect(await page.locator('body').count()).toBe(1);
  267 |   });
  268 | });
  269 | 
```