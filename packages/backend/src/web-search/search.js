import axios from 'axios';

/**
 * Searches the web using Tavily API
 * @param {string} query - The search query
 * @param {object} options - Search options
 * @param {number} [options.maxResults=5]
 * @returns {Promise<Array<{title: string, url: string, snippet: string}>>}
 */
export async function search(query, options = {}) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is missing from environment variables');
  }

  const { maxResults = 5 } = options;

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: query,
      search_depth: 'basic',
      include_answer: false,
      include_images: false,
      include_raw_content: false,
      max_results: maxResults,
    });

    if (!response.data || !response.data.results) {
      return [];
    }

    return response.data.results.map((r) => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
    }));
  } catch (err) {
    console.error(`[Search Error]: ${err.message}`);
    throw err;
  }
}
