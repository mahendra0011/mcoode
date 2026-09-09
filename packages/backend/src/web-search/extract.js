import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts clean structured text, metadata, and key links from HTML.
 * Inspired by open-webSearch's multi-stage extraction pipeline.
 *
 * @param {string} html Raw HTML
 * @param {string} [baseUrl=''] Source page URL for resolving relative links
 * @returns {{ text: string, title: string, description: string, siteName: string, links: Array<{text: string, href: string}> }}
 */
export function extractContent(html, baseUrl = '') {
  if (!html || typeof html !== 'string') {
    return { text: '', title: '', description: '', siteName: '', links: [] };
  }

  try {
    const doc = new JSDOM(html, { url: baseUrl || 'http://localhost' });
    const document = doc.window.document;

    // 1. Metadata extraction (open-webSearch pattern)
    const title = document.querySelector('title')?.textContent?.trim() ||
      document.querySelector('meta[property="og:title"]')?.getAttribute('content')?.trim() || '';

    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
      document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() || '';

    const siteName = document.querySelector('meta[property="og:site_name"]')?.getAttribute('content')?.trim() || '';
    const byline = document.querySelector('meta[name="author"]')?.getAttribute('content')?.trim() || '';

    // 2. Try Mozilla Readability first
    try {
      const reader = new Readability(document.cloneNode(true));
      const article = reader.parse();
      if (article && article.textContent && article.textContent.trim().length >= 150) {
        const links = extractKeyLinks(document, baseUrl);
        return {
          text: normalizeText(article.textContent),
          title: article.title || title,
          description: article.excerpt || description,
          siteName: article.siteName || siteName,
          byline: article.byline || byline,
          links
        };
      }
    } catch { /* fall through to container extraction */ }

    // 3. Container-based extraction (from open-webSearch preferredContainers)
    // Remove unwanted boilerplate elements
    const unwanted = document.querySelectorAll(
      'script, style, noscript, template, iframe, svg, canvas, nav, footer, header, form, aside, .ad, .ads, .sidebar, #sidebar'
    );
    unwanted.forEach(el => el.remove());

    const preferredContainers = [
      'article',
      'main',
      '[role="main"]',
      '.markdown-body',
      '.article-content',
      '.post-content',
      '.entry-content',
      '#content',
      '.content'
    ];

    for (const selector of preferredContainers) {
      const container = document.querySelector(selector);
      if (container) {
        const text = normalizeText(container.textContent || '');
        if (text.length >= 120) {
          const links = extractKeyLinks(container, baseUrl);
          return { text, title, description, siteName, byline, links };
        }
      }
    }

    // 4. Body fallback
    const bodyText = normalizeText(document.body?.textContent || '');
    if (bodyText.length >= 60) {
      const links = extractKeyLinks(document.body || document, baseUrl);
      return { text: bodyText, title, description, siteName, byline, links };
    }

    // 5. Metadata fallback for JS-heavy SPA sites
    const metaFallback = [title, description].filter(Boolean).join('\n\n');
    return {
      text: normalizeText(metaFallback),
      title,
      description,
      siteName,
      byline,
      links: []
    };
  } catch (err) {
    console.error(`[extractContent Error]: ${err.message}`);
    return { text: '', title: '', description: '', siteName: '', links: [] };
  }
}

/**
 * Extracts clean navigation/reference links from a container.
 */
function extractKeyLinks(container, baseUrl) {
  if (!container || !baseUrl) return [];
  const anchors = container.querySelectorAll ? container.querySelectorAll('a[href]') : [];
  const links = [];
  const seen = new Set();

  for (const a of anchors) {
    const rawHref = a.getAttribute('href')?.trim();
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;
    try {
      const resolved = new URL(rawHref, baseUrl).toString();
      if (!resolved.startsWith('http://') && !resolved.startsWith('https://')) continue;
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      const text = normalizeText(a.textContent || '');
      if (text && text.length > 2 && text.length < 80) {
        links.push({ text, href: resolved });
      }
      if (links.length >= 10) break;
    } catch { /* invalid URL */ }
  }
  return links;
}

/**
 * Backwards-compatible helper for code expecting a plain string
 */
export function extractCleanText(html, baseUrl = '') {
  return extractContent(html, baseUrl).text;
}
