import { EVENTS } from '@mcode/shared';

/**
 * BrowserTool — headless browser automation via Playwright.
 * Lazy-launches Chromium only when a browser tool is actually called,
 * and auto-closes after an idle timeout to free resources.
 *
 * This is the Antigravity/Codex/Claude-in-Chrome pattern: the AI "sees"
 * a live page, clicks/types/navigates, and takes screenshots or accessibility
 * snapshots to verify the result.
 */
export class BrowserTool {
  constructor({ projectPath, bus = null, timeoutMs = 300_000 }) {
    this.projectPath = projectPath;
    this.bus = bus;
    this.timeoutMs = timeoutMs;
    this.browser = null;
    this.page = null;
    this._idleTimer = null;
    this._consoleErrors = [];
    this._active = false;
  }

  /** Lazily launch Chromium if not already running. Sets up console/error listeners. */
  async _ensureBrowser() {
    if (this.page) {
      this._resetIdleTimer();
      return this.page;
    }

    const { chromium } = await import('playwright');
    this.browser = await chromium.launch({ headless: true });
    const context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    this.page = await context.newPage();

    // Collect console errors and page errors for browser_get_console_errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this._consoleErrors.push({
          text: msg.text(),
          location: msg.location?.url || '',
          line: msg.location?.lineNumber || 0,
        });
      }
    });
    this.page.on('pageerror', (err) => {
      this._consoleErrors.push({
        text: err.message,
        location: '',
        line: 0,
      });
    });
    this.page.on('requestfailed', (req) => {
      this._consoleErrors.push({
        text: `Failed to load: ${req.url()} — ${req.failure()?.errorText || 'unknown'}`,
        location: req.url(),
        line: 0,
      });
    });

    this._active = true;
    this._resetIdleTimer();
    return this.page;
  }

  /** Reset the idle timer — if no tool is called within timeoutMs, close the browser. */
  _resetIdleTimer() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = setTimeout(() => {
      this.close();
    }, this.timeoutMs);
  }

  /**
   * Close the browser and clean up. Called on idle timeout or when
   * the agent session ends.
   */
  async close() {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._idleTimer = null;
    try {
      await this.browser?.close();
    } catch {
      /* ignore */
    }
    this.browser = null;
    this.page = null;
    this._active = false;
    this._consoleErrors = [];
  }

  /** Emit a MESSAGE event on the bus so the frontend can display browser actions. */
  _emitStep(toolName, detail) {
    if (this.bus) {
      this.bus.emit(EVENTS.MESSAGE, {
        kind: 'tool',
        tool: toolName,
        args: JSON.stringify(detail).slice(0, 200),
        status: 'running',
        ...detail,
      });
    }
  }

  /** Emit a result event after the tool completes. */
  _emitResult(toolName, result) {
    if (this.bus) {
      this.bus.emit(EVENTS.MESSAGE, {
        kind: 'tool',
        tool: toolName,
        status: 'done',
        result: JSON.stringify(result).slice(0, 500),
      });
    }
  }

  async browser_navigate({ url }) {
    const page = await this._ensureBrowser();
    this._emitStep('browser_navigate', { url });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    this._resetIdleTimer();
    const title = await page.title();
    const result = { ok: true, url: page.url(), title };
    this._emitResult('browser_navigate', result);
    return result;
  }

  async browser_click({ selector, text }) {
    const page = await this._ensureBrowser();
    this._emitStep('browser_click', { selector, text });

    const locator = text ? page.getByText(text) : page.locator(selector);
    await locator.waitFor({ state: 'attached', timeout: 5000 });
    await locator.click({ timeout: 5000 });
    this._resetIdleTimer();

    const result = { ok: true };
    this._emitResult('browser_click', result);
    return result;
  }

  async browser_type({ selector, value }) {
    const page = await this._ensureBrowser();
    this._emitStep('browser_type', { selector, value: value?.slice(0, 50) });

    await page.locator(selector).waitFor({ state: 'attached', timeout: 5000 });
    await page.locator(selector).fill(value || '');
    this._resetIdleTimer();

    const result = { ok: true };
    this._emitResult('browser_type', result);
    return result;
  }

  async browser_screenshot({ fullPage = false } = {}) {
    const page = await this._ensureBrowser();
    this._emitStep('browser_screenshot', { fullPage });

    const buffer = await page.screenshot({ fullPage });
    const base64 = buffer.toString('base64');
    const result = { ok: true, image: `data:image/png;base64,${base64}` };
    this._emitResult('browser_screenshot', { ok: true });
    return result;
  }

  async browser_snapshot() {
    const page = await this._ensureBrowser();
    this._emitStep('browser_snapshot', {});

    let snapshot = null;
    try {
      snapshot = await page.accessibility.snapshot();
    } catch {
      /* accessibility snapshot not available — fall back to page content */
      snapshot = {
        name: 'Page',
        children: [
          {
            name: 'body',
            children: [{ name: page.url(), value: await page.textContent('body').catch(() => '') }],
          },
        ],
      };
    }

    const result = { ok: true, snapshot };
    this._emitResult('browser_snapshot', { ok: true });
    return result;
  }

  async browser_get_console_errors() {
    const errors = this._consoleErrors || [];
    const result = { ok: true, errors };
    // Clear after reading
    this._consoleErrors = [];
    return result;
  }

  /** Tool metadata for the registry. */
  tools() {
    return {
      browser_navigate: {
        description: 'Open a URL in a real browser to test the running app',
        parameters: { url: 'string' },
      },
      browser_click: {
        description: 'Click an element by CSS selector or visible text',
        parameters: { selector: 'string?', text: 'string?' },
      },
      browser_type: {
        description: 'Type text into an input field',
        parameters: { selector: 'string', value: 'string' },
      },
      browser_screenshot: {
        description: 'Take a screenshot of the current page state',
        parameters: { fullPage: 'boolean?' },
      },
      browser_snapshot: {
        description: 'Get the accessibility tree of the current page (cheaper than a screenshot)',
        parameters: {},
      },
      browser_get_console_errors: {
        description: 'Check for JS errors logged in the browser console',
        parameters: {},
      },
    };
  }
}
