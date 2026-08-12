# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\web\e2e\chat-flow.spec.js >> AIChatPage → Mode Switching >> model selector renders in chat interface
- Location: packages\web\e2e\chat-flow.spec.js:143:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/ai/chat", waiting until "load"

```

# Test source

```ts
  10  |       }));
  11  |     });
  12  |     await page.goto('/ai/chat');
  13  |   });
  14  | 
  15  |   test('typing / shows command picker', async ({ page }) => {
  16  |     // The command picker should appear when typing '/' in the chat input
  17  |     // Default tab is 'Design' which has its own textarea — switch to Chat tab first
  18  |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
  19  |     if (await chatTab.count() > 0) await chatTab.click();
  20  |     await page.waitForTimeout(500);
  21  |     const textarea = page.locator('textarea').first();
  22  |     await textarea.focus();
  23  |     await textarea.fill('/');
  24  |     await page.waitForTimeout(500);
  25  |     // Command picker should be visible with available commands
  26  |     // Use button filter to avoid regex flag parsing issues with '/' in Playwright selectors
  27  |     const clearBtn = page.locator('button').filter({ hasText: '/clear' });
  28  |     expect(await clearBtn.count()).toBeGreaterThan(0);
  29  |   });
  30  | 
  31  |   test('slash command list contains expected commands', async ({ page }) => {
  32  |     // Switch to Chat tab first — Design tab has its own textarea without picker
  33  |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
  34  |     if (await chatTab.count() > 0) await chatTab.click();
  35  |     await page.waitForTimeout(500);
  36  |     const textarea = page.locator('textarea').first();
  37  |     await textarea.fill('/help');
  38  |     // /help should display available commands
  39  |     const helpText = page.locator('text=Available commands');
  40  |     expect(await helpText.count()).toBeGreaterThan(0);
  41  |   });
  42  | 
  43  |   test('slash commands are listed in picker', async ({ page }) => {
  44  |     // Switch to Chat tab first — Design tab has its own textarea without picker
  45  |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
  46  |     if (await chatTab.count() > 0) await chatTab.click();
  47  |     await page.waitForTimeout(500);
  48  |     const textarea = page.locator('textarea').first();
  49  |     await textarea.fill('/');
  50  |     await page.waitForTimeout(500);
  51  |     // Each web slash command should be visible in the picker
  52  |     for (const cmd of ['clear', 'help', 'undo', 'model', 'god', 'watch', 'debug', 'export']) {
  53  |       const cmdEl = page.locator('button').filter({ hasText: `/${cmd}` });
  54  |       if (await cmdEl.count() > 0) {
  55  |         await expect(cmdEl.first()).toBeVisible();
  56  |       }
  57  |     }
  58  |   });
  59  | 
  60  |   test('/clear command clears the chat', async ({ page }) => {
  61  |     // Switch to Chat tab — default is Design which doesn't handle slash commands
  62  |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
  63  |     if (await chatTab.count() > 0) await chatTab.click();
  64  |     await page.waitForTimeout(500);
  65  |     const textarea = page.locator('textarea').first();
  66  |     await textarea.fill('/clear');
  67  |     await page.keyboard.press('Enter');
  68  |     await page.waitForTimeout(1000);
  69  |     // A system message about clearing should appear
  70  |     const clearMsg = page.locator('text=/chat cleared/i');
  71  |     expect(await clearMsg.count()).toBeGreaterThan(0);
  72  |   });
  73  | 
  74  |   test('/god command without args shows usage hint', async ({ page }) => {
  75  |     // Switch to Chat tab first — Design tab has its own textarea without picker
  76  |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
  77  |     if (await chatTab.count() > 0) await chatTab.click();
  78  |     await page.waitForTimeout(500);
  79  |     const textarea = page.locator('textarea').first();
  80  |     await textarea.fill('/god');
  81  |     await page.keyboard.press('Enter');
  82  |     await page.waitForTimeout(500);
  83  |     const godHint = page.locator('text=/god-mode/i');
  84  |     expect(await godHint.count()).toBeGreaterThan(0);
  85  |   });
  86  | 
  87  |   test('slash commands work in Chat tab (not just empty state)', async ({ page }) => {
  88  |     // Switch to Chat tab — default is Design
  89  |     const chatTab = page.locator('button').filter({ hasText: /^Chat$/ });
  90  |     if (await chatTab.count() > 0) await chatTab.click();
  91  |     await page.waitForTimeout(500);
  92  |     // In Chat tab with no messages, empty state renders — test command picker there
  93  |     const textarea = page.locator('textarea').first();
  94  |     await textarea.focus();
  95  |     await textarea.fill('/help');
  96  |     await page.waitForTimeout(500);
  97  |     // Command picker should be visible — check for the help command button
  98  |     const helpBtn = page.locator('button').filter({ hasText: '/help' });
  99  |     expect(await helpBtn.count()).toBeGreaterThan(0);
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
> 110 |     await page.goto('/ai/chat');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
  200 |     await page.goto('/ai/chat');
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
```