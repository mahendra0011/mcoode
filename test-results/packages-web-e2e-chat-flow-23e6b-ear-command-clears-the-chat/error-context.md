# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: packages\web\e2e\chat-flow.spec.js >> AIChatPage → Slash Commands >> /clear command clears the chat
- Location: packages\web\e2e\chat-flow.spec.js:60:3

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/ai/chat", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | // ── Chat flow: modes, slash commands, model selector ──
  4   | 
  5   | test.describe('AIChatPage → Slash Commands', () => {
  6   |   test.beforeEach(async ({ page }) => {
  7   |     await page.addInitScript(() => {
  8   |       localStorage.setItem('mcode_tokens', JSON.stringify({
  9   |         access: 'fake-token-for-testing', refresh: 'fake-refresh'
  10  |       }));
  11  |     });
> 12  |     await page.goto('/ai/chat');
      |                ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
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
  110 |     await page.goto('/ai/chat');
  111 |   });
  112 | 
```