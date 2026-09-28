import { describe, it, expect, vi } from 'vitest';
import {
  extractSurroundingLines,
  inferDomain,
  cleanCompletionText,
  checkForStructuralSuggestion
} from '../src/routes/pair.js';
import {
  encryptKey,
  decryptKey,
  deriveMasterKey,
  encryptKeyV2,
  decryptKeyV2,
  createKeyManager,
  keyManagerFromEnv,
  parseKeyId,
  maskSecret,
  KEY_ID_JWT_FALLBACK,
  DEFAULT_KEY_ID,
} from '../src/secret-enc.js';

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

  describe('BSEC-001 envelope encryption (secret-enc key manager)', () => {
    const JWT = 'jwt-test-secret-0123456789abcdef';
    const ENC = 'dedicated-enc-secret-0123456789abcdef';

    it('round-trips v2 blobs under the dedicated secret', () => {
      const km = createKeyManager({ secret: JWT, encSecret: ENC });
      expect(km.dedicated).toBe(true);
      expect(km.keyId).toBe(DEFAULT_KEY_ID);
      const blob = km.encrypt('sk-test-key-12345', 'user-123');
      expect(blob.startsWith('MCCODEK2:')).toBe(true);
      expect(km.decrypt(blob, 'user-123')).toBe('sk-test-key-12345');
      expect(km.needsRotation(blob)).toBe(false);
    });

    it('keeps legacy v1 blobs readable and flags them for rotation', () => {
      const legacy = encryptKey('sk-legacy', deriveMasterKey(JWT, 'user-123'));
      const km = createKeyManager({ secret: JWT, encSecret: ENC });
      expect(km.decrypt(legacy, 'user-123')).toBe('sk-legacy');
      expect(km.needsRotation(legacy)).toBe(true);
      expect(parseKeyId(legacy)).toBe(null);
    });

    it('binds v2 ciphertext to the owner via AAD (wrong user fails)', () => {
      const km = createKeyManager({ secret: JWT, encSecret: ENC });
      const blob = km.encrypt('sk-test-key-12345', 'user-123');
      expect(() => km.decrypt(blob, 'user-456')).toThrow();
    });

    it('reads jwt1 fallback blobs written without a dedicated secret', () => {
      const fallback = createKeyManager({ secret: JWT });
      expect(fallback.dedicated).toBe(false);
      expect(fallback.keyId).toBe(KEY_ID_JWT_FALLBACK);
      const blob = fallback.encrypt('sk-fallback', 'user-123');
      expect(parseKeyId(blob)).toBe(KEY_ID_JWT_FALLBACK);
      // A fully-migrated manager (dedicated secret + JWT legacy read path) still reads it.
      const km = createKeyManager({ secret: JWT, encSecret: ENC });
      expect(km.decrypt(blob, 'user-123')).toBe('sk-fallback');
      expect(km.needsRotation(blob)).toBe(true);
    });

    it('supports rotation via a previous-secret keyring entry', () => {
      const oldKm = createKeyManager({ secret: JWT, encSecret: 'old-secret-0123456789abcdef', encKeyId: 'ek0' });
      const blob = oldKm.encrypt('sk-rotate-me', 'user-123');
      const rotated = createKeyManager({ secret: JWT, encSecret: ENC, encPreviousSecret: 'old-secret-0123456789abcdef', encPreviousKeyId: 'ek0' });
      const plain = rotated.decrypt(blob, 'user-123');
      expect(plain).toBe('sk-rotate-me');
      expect(rotated.needsRotation(blob)).toBe(true);
      const fresh = rotated.encrypt(plain, 'user-123');
      expect(rotated.needsRotation(fresh)).toBe(false);
    });

    it('rejects unknown keyIds with an actionable error', () => {
      const km = createKeyManager({ secret: JWT, encSecret: ENC });
      const blob = encryptKeyV2('sk-x', { secret: 'some-other-secret', userId: 'user-123', keyId: 'ek9' });
      expect(() => km.decrypt(blob, 'user-123')).toThrow(/unknown encryption key id/);
    });

    it('keyManagerFromEnv prefers explicit options over env, and env over nothing', () => {
      const env = { API_KEY_ENCRYPTION_SECRET: ENC, API_KEY_ENCRYPTION_KEY_ID: 'ek7' };
      const fromEnv = keyManagerFromEnv({ secret: JWT, env });
      expect(fromEnv.dedicated).toBe(true);
      expect(fromEnv.keyId).toBe('ek7');
      const blob = fromEnv.encrypt('sk-env', 'user-1');
      expect(fromEnv.decrypt(blob, 'user-1')).toBe('sk-env');
      const explicit = keyManagerFromEnv({ secret: JWT, encSecret: 'override', env });
      expect(explicit.decrypt(explicit.encrypt('sk-y', 'u'), 'u')).toBe('sk-y');
    });

    it('masks secrets without leaking the middle', () => {
      expect(maskSecret('sk-abcdef1234567890')).toBe('sk-a••••••7890');
      expect(maskSecret('short')).toBe('••••••••'); // fixed-width mask: never leaks exact length of short secrets
      expect(maskSecret('')).toBe('');
    });

    it('v2 decrypt rejects tampered blobs', () => {
      const blob = encryptKeyV2('sk-tamper', { secret: ENC, userId: 'user-1' });
      const tampered = `${blob.slice(0, -4)}AAAA`;
      expect(() => decryptKeyV2(tampered, { secret: ENC, userId: 'user-1' })).toThrow();
    });

    it('legacy v1 round-trip stays byte-compatible', () => {
      const master = deriveMasterKey(JWT, 'user-123');
      const blob = encryptKey('sk-v1', master);
      expect(blob.startsWith('TUNDT0RFS0')).toBe(true);
      expect(decryptKey(blob, master)).toBe('sk-v1');
    });
  });
});
