import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

/**
 * Extracts clean text from raw HTML using Readability
 * @param {string} html
 * @returns {string} Clean article text
 */
export function extractCleanText(html) {
  if (!html || typeof html !== 'string') return '';
  
  try {
    const doc = new JSDOM(html, { url: 'http://localhost' });
    const reader = new Readability(doc.window.document);
    const article = reader.parse();
    
    if (article && article.textContent) {
      // Clean up excessive whitespace
      return article.textContent
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
    }
    
    // If Readability fails, fallback to basic tag stripping
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
               .replace(/<[^>]+>/g, ' ')
               .replace(/\n\s*\n/g, '\n\n')
               .replace(/[ \t]+/g, ' ')
               .trim();
               
  } catch (err) {
    console.error(`[Extract Error]: ${err.message}`);
    return '';
  }
}
