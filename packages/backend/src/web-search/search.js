import axios from 'axios';
import { JSDOM } from 'jsdom';

/**
 * Decodes Bing redirect URLs (e.g. https://www.bing.com/ck/a?!...&u=a1<base64>&...)
 * Handles URL-safe base64 (- and _), variable padding, and verifies standard HTTP/HTTPS schemes.
 * @param {string} url
 * @returns {string} Decoded destination URL or original URL
 */
function decodeBingRedirect(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.includes('bing.com/ck/a')) {
    try {
      const parsed = new URL(url, 'https://www.bing.com');
      const uParam = parsed.searchParams.get('u');
      if (uParam && uParam.length > 2) {
        let b64 = (uParam.startsWith('a1') || uParam.startsWith('a0')) ? uParam.slice(2) : uParam;
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const decoded = Buffer.from(b64, 'base64').toString('utf-8');
        if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
          return decoded;
        }
      }
    } catch { /* ignore and return original */ }
  }
  return url;
}

/**
 * Searches DuckDuckGo Lite HTML — fast, no API key, returns direct clean URLs without redirects.
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
async function searchDDGLite(query, maxResults = 5) {
  try {
    const res = await axios.post('https://lite.duckduckgo.com/lite/', 'q=' + encodeURIComponent(query), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Cache-Control': 'no-cache',
      },
      timeout: 7000,
      validateStatus: () => true
    });

    if (typeof res.data !== 'string' || !res.data.trim()) return [];

    const dom = new JSDOM(res.data);
    const doc = dom.window.document;
    const links = doc.querySelectorAll('.result-link');
    const snippets = doc.querySelectorAll('.result-snippet');
    const results = [];

    for (let i = 0; i < links.length && results.length < maxResults; i++) {
      const a = links[i];
      let href = a.getAttribute('href') || '';
      if (href.includes('uddg=')) {
        try {
          const u = new URL(href, 'https://duckduckgo.com');
          href = decodeURIComponent(u.searchParams.get('uddg'));
        } catch { /* ignore */ }
      }

      const title = a.textContent.trim();
      const snippet = snippets[i]?.textContent?.trim().replace(/\s+/g, ' ') || '';

      if (title && href && href.startsWith('http') && !href.includes('duckduckgo.com')) {
        results.push({ title, url: href, snippet });
      }
    }
    return results;
  } catch (err) {
    console.warn(`[searchDDGLite error]: ${err.message}`);
    return [];
  }
}

/**
 * Searches Bing HTML with redirect decoding and strict domain exclusion.
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
async function searchBing(query, maxResults = 5) {
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${maxResults * 2}&setmkt=en-US&setlang=en-US`;
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.bing.com/',
        'Cache-Control': 'no-cache',
      },
      timeout: 7000,
      validateStatus: () => true,
    });

    const html = response.data;
    if (typeof html !== 'string' || !html.trim()) return [];

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const resultEls = doc.querySelectorAll('li.b_algo');
    const results = [];

    for (const el of resultEls) {
      if (results.length >= maxResults) break;

      const link = el.querySelector('h2 a');
      if (!link) continue;

      const title = link.textContent.trim();
      let rawUrl = link.getAttribute('href') || '';
      const url = decodeBingRedirect(rawUrl);

      // Filter out invalid URLs and any links remaining on bing.com or microsoft.com
      if (!url || !url.startsWith('http') || url.includes('bing.com') || url.includes('microsoft.com')) {
        continue;
      }

      let snippet = '';
      const caption = el.querySelector('.b_caption p');
      if (caption) {
        snippet = caption.textContent.trim().replace(/\s+/g, ' ');
      }

      if (title && url) {
        results.push({ title, url, snippet });
      }
    }
    return results;
  } catch (err) {
    console.warn(`[searchBing error]: ${err.message}`);
    return [];
  }
}

/**
 * Searches Wikipedia OpenSearch API as a high-reliability fallback for encyclopedic/factual queries.
 * @param {string} query
 * @param {number} maxResults
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
async function searchWikipedia(query, maxResults = 5) {
  try {
    const url = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=${maxResults}&namespace=0&format=json`;
    const res = await axios.get(url, { timeout: 4000 });
    const data = res.data;
    if (Array.isArray(data) && data.length >= 4) {
      const titles = data[1] || [];
      const snippets = data[2] || [];
      const urls = data[3] || [];
      const results = [];
      for (let i = 0; i < titles.length && i < maxResults; i++) {
        if (urls[i] && urls[i].startsWith('http')) {
          results.push({
            title: titles[i],
            url: urls[i],
            snippet: snippets[i] || ''
          });
        }
      }
      return results;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Custom web search — no API key, no 3rd party paid services.
 * Combines DuckDuckGo Lite, Bing (with URL decoding), and Wikipedia fallback.
 * @param {string} query - The search query
 * @param {object} options
 * @param {number} [options.maxResults=5]
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
export async function search(query, options = {}) {
  const { maxResults = 5 } = options;
  if (!query || typeof query !== 'string') return [];

  const cleanQuery = query.replace(/^["']|["']$/g, '').trim();
  if (!cleanQuery) return [];

  // Tier 1: DuckDuckGo Lite (unwrapped direct URLs, clean non-commercial results)
  let results = await searchDDGLite(cleanQuery, maxResults);

  // Tier 2: Bing (with redirect decoding & domain filtering)
  if (results.length === 0) {
    results = await searchBing(cleanQuery, maxResults);
  }

  // Tier 3: Wikipedia OpenSearch fallback
  if (results.length === 0) {
    results = await searchWikipedia(cleanQuery, maxResults);
  }

  return results.slice(0, maxResults);
}
