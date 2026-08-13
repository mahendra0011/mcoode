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
 * Fetches HTML content, falling back to Playwright if necessary.
 * @param {string} url
 * @returns {Promise<{html: string, method: 'fetch'|'playwright'|'error'}>}
 */
export async function fetchPage(url) {
  try {
    // 1. Try standard axios fetch with a realistic user agent
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 8000,
      validateStatus: () => true, // resolve on all status codes to handle redirects/errors manually if needed
    });

    if (response.status >= 200 && response.status < 300) {
      const html = response.data;
      if (typeof html === 'string') {
        // Heuristic: if very little visible text (stripped HTML tags) or heavily script-based
        const strippedText = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').replace(/<[^>]+>/g, '').trim();
        
        // If we have decent content, use it. Otherwise, fall back.
        if (strippedText.length > 500 && !html.toLowerCase().includes('enable javascript')) {
          return { html, method: 'fetch' };
        }
      }
    }
  } catch (err) {
    // Timeout or network error on standard fetch -> fall through to playwright
    console.warn(`[fetchPage] Standard fetch failed for ${url}: ${err.message}, falling back to Playwright.`);
  }

  // 2. Playwright fallback
  let page = null;
  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    page = await context.newPage();
    
    // Block images, css, fonts to speed up page load
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(type)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Wait briefly for hydration or dynamically loaded content
    await page.waitForTimeout(1000);
    
    const html = await page.content();
    await context.close();
    
    return { html, method: 'playwright' };
  } catch (err) {
    if (page) await page.context().close().catch(() => {});
    console.error(`[fetchPage] Playwright fallback failed for ${url}: ${err.message}`);
    return { html: '', method: 'error' };
  }
}
