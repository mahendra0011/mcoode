import { chromium } from 'playwright';
import axios from 'axios';

let browserInstance = null;

export async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await chromium.launch({ headless: true });
  }
  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

/**
 * Fetches HTML or Markdown content, falling back to Playwright only for JS-heavy SPAs.
 * Features from open-webSearch: markdown detection, realistic header bundle,
 * resource aborts for speed.
 *
 * @param {string} url
 * @returns {Promise<{html: string, isMarkdown?: boolean, method: 'fetch'|'playwright'|'error'}>}
 */
export async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
        'Accept': 'text/markdown,text/plain,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
    });

    const contentType = String(response.headers['content-type'] || '').toLowerCase();
    const isMarkdown =
      contentType.includes('text/markdown') ||
      contentType.includes('text/x-markdown') ||
      url.endsWith('.md') ||
      url.endsWith('.markdown');

    if (response.status >= 200 && response.status < 400) {
      const data = response.data;
      if (typeof data === 'string') {
        if (isMarkdown) {
          return { html: data, isMarkdown: true, method: 'fetch' };
        }

        // Fast text content check (open-webSearch pattern)
        const strippedText = data
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .trim();

        // If we have >= 200 characters of real text and it's not a bot challenge, return it
        const isBotChallenge =
          /verify you are human|security check|enable javascript|ddos-guard|cf-browser-verification/i.test(data);

        if (strippedText.length >= 200 && !isBotChallenge) {
          return { html: data, isMarkdown: false, method: 'fetch' };
        }
      }
    }
  } catch (err) {
    console.warn(`[fetchPage] Standard fetch failed for ${url}: ${err.message}, trying headless browser.`);
  }

  // 2. Playwright fallback for SPA / bot-protected pages
  let page = null;
  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36'
    });
    page = await context.newPage();

    // Abort heavy media, fonts, images to load in 1-2 seconds
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(800);

    const html = await page.content();
    await context.close();

    return { html, isMarkdown: false, method: 'playwright' };
  } catch (err) {
    if (page) await page.context().close().catch(() => {});
    console.error(`[fetchPage] Playwright fallback failed for ${url}: ${err.message}`);
    return { html: '', isMarkdown: false, method: 'error' };
  }
}
