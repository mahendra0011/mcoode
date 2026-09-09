import { search } from './search.js';
import { fetchPage, closeBrowser } from './fetchPage.js';
import { extractContent, extractCleanText } from './extract.js';
import url from 'url';

export { closeBrowser } from './fetchPage.js';
export { search } from './search.js';
export { fetchPage } from './fetchPage.js';
export { extractContent, extractCleanText } from './extract.js';

/**
 * Orchestrates the Search -> Fetch -> Extract pipeline (open-webSearch pattern)
 * @param {string} query 
 * @param {object} options 
 * @returns {Promise<Array>}
 */
export async function searchAndFetch(query, options = {}) {
  const { maxResults = 5, maxCharsPerPage = 3000 } = options;
  
  // 1. Multi-Engine Search
  console.log(`[Pipeline] Searching for: "${query}"...`);
  const searchResults = await search(query, { maxResults });
  console.log(`[Pipeline] Found ${searchResults.length} results.`);

  if (searchResults.length === 0) return [];

  // 2. Fetch and Extract in parallel
  const enrichedResults = await Promise.all(searchResults.map(async (res) => {
    try {
      console.log(`[Pipeline] Fetching ${res.url}...`);
      const { html, isMarkdown, method } = await fetchPage(res.url);
      
      let content = '';
      let metadata = {};
      
      if (html) {
        if (isMarkdown) {
          content = html.trim();
        } else {
          metadata = extractContent(html, res.url);
          content = metadata.text || metadata.description || res.snippet || '';
        }
      }

      // Fallback to search snippet if page content was blocked or empty
      if (!content || content.length < 50) {
        content = res.snippet || content;
      }

      // Truncate to preserve context window
      if (content.length > maxCharsPerPage) {
        content = content.substring(0, maxCharsPerPage) + '... (truncated)';
      }

      return {
        title: metadata.title || res.title,
        url: res.url,
        snippet: res.snippet,
        content,
        siteName: metadata.siteName || '',
        links: metadata.links || [],
        fetchMethod: method,
        ok: Boolean(content && content.length > 0)
      };
    } catch (err) {
      console.warn(`[Pipeline] Error processing ${res.url}: ${err.message}`);
      return {
        title: res.title,
        url: res.url,
        snippet: res.snippet,
        content: res.snippet || '',
        fetchMethod: 'error',
        ok: Boolean(res.snippet)
      };
    }
  }));
  
  return enrichedResults;
}

/**
 * Builds a clean, structured string context block for the LLM.
 */
export function buildContextBlock(results) {
  if (!results || results.length === 0) return 'No web search results found.';
  
  const blocks = results.filter(r => r.ok).map((r, i) => {
    let block = `--- Source ${i + 1}: ${r.title} ---\nURL: ${r.url}`;
    if (r.siteName) block += `\nSite: ${r.siteName}`;
    block += `\n\n${r.content}`;
    if (r.links && r.links.length > 0) {
      block += `\n\nRelated Links:\n` + r.links.slice(0, 5).map(l => `- [${l.text}](${l.href})`).join('\n');
    }
    return block;
  });
  
  return blocks.join('\n\n');
}

// CLI test harness
const isMain = process.argv[1] && import.meta.url === url.pathToFileURL(process.argv[1]).href;

if (isMain) {
  const query = process.argv[2];
  if (!query) {
    console.error('Usage: node index.js "your search query"');
    process.exit(1);
  }
  
  (async () => {
    try {
      const results = await searchAndFetch(query, { maxResults: 3, maxCharsPerPage: 1500 });
      console.log('\n================== CONTEXT BLOCK ==================\n');
      console.log(buildContextBlock(results));
      console.log('\n===================================================\n');
      console.log(`Stats:`);
      results.forEach(r => {
        console.log(`- ${r.url}: method=${r.fetchMethod}, chars=${r.content?.length}`);
      });
    } catch (err) {
      console.error(err);
    } finally {
      await closeBrowser();
    }
  })();
}
