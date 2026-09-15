import { describe, it, expect, vi } from 'vitest';
import {
  extractSurroundingLines,
  inferDomain,
  cleanCompletionText,
  checkForStructuralSuggestion
} from '../src/routes/pair.js';

describe('Pair Mode Backend Logic (Doc 53)', () => {
  describe('extractSurroundingLines', () => {
    it('extracts surrounding lines within window around cursor', () => {
      const code = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join('\n');
      const window = extractSurroundingLines(code, 50, 20);
      const lines = window.split('\n');

      expect(lines.length).toBeLessThanOrEqual(21);
      expect(window).toContain('line 50');
      expect(window).toContain('line 42');
      expect(window).toContain('line 58');
    });

    it('handles edge cases: cursor at start and end of file', () => {
      const code = 'const a = 1;\nconst b = 2;\nconst c = 3;';
      expect(extractSurroundingLines(code, 1, 10)).toBe(code);
      expect(extractSurroundingLines(code, 3, 10)).toBe(code);
      expect(extractSurroundingLines('', 1, 10)).toBe('');
    });
  });

  describe('inferDomain', () => {
    it('infers correct domain from file extensions', () => {
      expect(inferDomain('src/components/Header.tsx')).toBe('frontend');
      expect(inferDomain('src/styles/main.css')).toBe('frontend');
      expect(inferDomain('src/server/api.py')).toBe('backend');
      expect(inferDomain('cmd/main.go')).toBe('backend');
      expect(inferDomain('prisma/schema.prisma')).toBe('db');
      expect(inferDomain('migrations/001_init.sql')).toBe('db');
      expect(inferDomain('tests/auth.test.js')).toBe('test');
    });
  });

  describe('cleanCompletionText', () => {
    it('strips markdown fences and normalizes text', () => {
      const markdownCode = '```typescript\n  const total = items.reduce((acc, i) => acc + i.price, 0);\n```';
      const cleaned = cleanCompletionText(markdownCode);
      expect(cleaned).toBe('  const total = items.reduce((acc, i) => acc + i.price, 0);');
      expect(cleaned).not.toContain('```');
    });

    it('preserves plain completions and trims trailing whitespace', () => {
      expect(cleanCompletionText('  return res.status(200).json(user);   \n')).toBe('  return res.status(200).json(user);');
    });
  });

  describe('checkForStructuralSuggestion (Conversational Layer)', () => {
    it('suggests error handling for unhandled await expressions', async () => {
      const code = `
        async function fetchUserProfile(userId) {
          const profile = await api.getProfile(userId);
          return profile;
        }
      `;

      const suggestion = await checkForStructuralSuggestion({
        fileContent: code,
        cursorLine: 3,
        filePath: 'src/api/user.js'
      });

      expect(suggestion).toBeDefined();
      expect(suggestion.message).toContain('try/catch');
      expect(suggestion.preview).toContain('try {');
      expect(suggestion.preview).toContain('catch (err)');
    });

    it('suggests extracting repeated literals into constants', async () => {
      const code = `
        function configureAuth() {
          const a = "/api/v1/user/profile";
          console.log("/api/v1/user/profile");
          return "/api/v1/user/profile";
        }
      `;

      const suggestion = await checkForStructuralSuggestion({
        fileContent: code,
        cursorLine: 3,
        filePath: 'src/config.js'
      });

      expect(suggestion).toBeDefined();
      expect(suggestion.message).toContain('repeated literal');
      expect(suggestion.preview).toContain('const ');
    });

    it('suggests safe parsing for unguarded JSON.parse', async () => {
      const code = 'const payload = JSON.parse(rawString);';
      const suggestion = await checkForStructuralSuggestion({
        fileContent: code,
        cursorLine: 1,
        filePath: 'src/parser.js'
      });

      expect(suggestion).toBeDefined();
      expect(suggestion.message).toContain('JSON.parse');
    });
  });
});
