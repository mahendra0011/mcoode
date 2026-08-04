import { describe, it, expect, beforeEach } from 'vitest';
import { ModelRouter } from '../src/core/router.js';
import { MockProvider } from '../src/providers/mock.js';

describe('ModelRouter with only the mock provider', () => {
  let router;
  let ledger;

  beforeEach(() => {
    const providers = [new MockProvider()];
    const config = { routing: {} };
    router = new ModelRouter({ secrets: {}, config, providers });
    ledger = router.ledger;
  });

  it('picks mock:mock for any domain', async () => {
    for (const domain of ['frontend', 'backend', 'db', 'devops', 'test', 'docs', 'bugfix', 'planning']) {
      const picked = await router.pick(domain);
      expect(picked.provider.id).toBe('mock');
      expect(picked.model.id).toBe('mock');
      expect(picked.ref).toBe('mock:mock');
    }
  });

  it('returns null when everything is rate-limited', async () => {
    for (let i = 0; i < 61; i += 1) {
      ledger.record('mock', { promptTokens: 100, completionTokens: 100 });
    }
    const picked = await router.pick('backend');
    expect(picked).toBeNull();
  });

  it('honors excludes (both preference and fallback paths)', async () => {
    const picked = await router.pick('frontend', { exclude: ['mock:mock'] });
    expect(picked).toBeNull();
  });

  it('applies user routing overrides', async () => {
    const custom = new ModelRouter({
      secrets: {},
      config: { routing: { frontend: ['mock:mock'] } },
      providers: [new MockProvider()]
    });
    const picked = await custom.pick('frontend');
    expect(picked.ref).toBe('mock:mock');
  });
});
