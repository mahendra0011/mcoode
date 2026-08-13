import { search } from './search.js';
import { fetchPage, closeBrowser } from './fetchPage.js';
import { extractCleanText } from './extract.js';
import url from 'url';

export { closeBrowser } from './fetchPage.js';

/**
 * Orchestrates the Search -> Fetch -> Extract pipeline
 * @param {string} query 
 * @param {object} options 
 * @returns {Promise<Array>}
 */
export async function searchAndFetch(query, options = {}) {
  const { maxResults = 5, maxCharsPerPage = 3000 } = options;
  
  // 1. Search
  console.log(`[Pipeline] Searching for: "${query}"...`);
  const searchResults = await search(query, { maxResults });
  console.log(`[Pipeline] Found ${searchResults.length} results.`);

  // 2. Fetch and Extract in parallel
  const enrichedResults = await Promise.all(searchResults.map(async (res) => {
    console.log(`[Pipeline] Fetching ${res.url}...`);
    const { html, method } = await fetchPage(res.url);
    
    let content = '';
    let ok = false;
    
    if (html) {
      content = extractCleanText(html);
      ok = content.length > 0;
      
      // Truncate to save context window
      if (content.length > maxCharsPerPage) {
        content = content.substring(0, maxCharsPerPage) + '... (truncated)';
      }
    }
    
    return {
      title: res.title,
      url: res.url,
      snippet: res.snippet,
      content,
      fetchMethod: method,
      ok
    };
  }));
  
  return enrichedResults;
}

/**
 * Builds a string context block for the LLM from the pipeline results.
 */
export function buildContextBlock(results) {
  if (!results || results.length === 0) return 'No web search results found.';
  
  const blocks = results.filter(r => r.ok).map((r, i) => {
    return `--- Source ${i + 1}: ${r.title} ---\nURL: ${r.url}\n\n${r.content}`;
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
        console.log(`- ${r.url}: method=${r.fetchMethod}, chars=${r.content.length}`);
      });
    } catch (err) {
      console.error(err);
    } finally {
      await closeBrowser();
    }
  })();
}
