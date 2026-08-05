import { describe, it, expect } from 'vitest';
import { PLUGIN_REGISTRY, PLUGIN_CATEGORIES, listPlugins } from '../src/plugins.js';

describe('plugin registry', () => {
  it('backs the "40+ official plugins" marketing claim honestly', () => {
    expect(Object.keys(PLUGIN_REGISTRY).length).toBeGreaterThanOrEqual(40);
  });

  it('every plugin has a category and description', () => {
    for (const [name, p] of Object.entries(PLUGIN_REGISTRY)) {
      expect(p.category, `${name} category`).toBeTruthy();
      expect(p.desc, `${name} desc`).toBeTruthy();
      expect(p.config, `${name} config`).toBeTruthy();
    }
  });

  it('categories are derived and unique', () => {
    expect(PLUGIN_CATEGORIES).toEqual([...new Set(PLUGIN_CATEGORIES)]);
    expect(PLUGIN_CATEGORIES).toContain('deploy');
    expect(PLUGIN_CATEGORIES).toContain('security');
  });

  it('filters by category', () => {
    const deploy = listPlugins({ category: 'deploy' });
    expect(deploy.length).toBeGreaterThan(3);
    expect(deploy.every((p) => p.category === 'deploy')).toBe(true);
  });

  it('deploy presets set config.deploy.target so ship can consume them', () => {
    for (const [name, p] of Object.entries(PLUGIN_REGISTRY)) {
      if (p.category !== 'deploy') continue;
      expect(p.config.deploy?.target, `${name} target`).toBeTruthy();
    }
  });
});