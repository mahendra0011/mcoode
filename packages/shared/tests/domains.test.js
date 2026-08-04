import { describe, it, expect } from 'vitest';
import { DEFAULT_ROUTING, DOMAIN_COLORS, TASK_DOMAINS } from '../src/domains.js';

describe('routing table', () => {
  it('covers every task domain', () => {
    for (const domain of TASK_DOMAINS) {
      expect(Array.isArray(DEFAULT_ROUTING[domain])).toBe(true);
      expect(DEFAULT_ROUTING[domain].length).toBeGreaterThan(0);
    }
  });

  it('always ends with the mock provider', () => {
    for (const domain of TASK_DOMAINS) {
      const last = DEFAULT_ROUTING[domain][DEFAULT_ROUTING[domain].length - 1];
      expect(last).toBe('mock:mock');
    }
  });

  it('defines a color for every domain', () => {
    for (const domain of TASK_DOMAINS) {
      expect(DOMAIN_COLORS[domain]).toBeDefined();
    }
  });
});
