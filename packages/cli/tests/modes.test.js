import { describe, it, expect } from 'vitest';
import {
  SPECIAL_MODES,
  MODE_META,
  getModeList,
  getModeMeta,
  describeMode
} from '../src/core/modes.js';

describe('SPECIAL_MODES', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(SPECIAL_MODES)).toBe(true);
  });

  it('defines exactly 10 modes', () => {
    expect(Object.keys(SPECIAL_MODES)).toHaveLength(10);
  });

  it('has the expected modes', () => {
    expect(SPECIAL_MODES.LEARNING).toBe('learning');
    expect(SPECIAL_MODES.COMPETITION).toBe('competition');
    expect(SPECIAL_MODES.ZEN).toBe('zen');
    expect(SPECIAL_MODES.FOCUS).toBe('focus');
    expect(SPECIAL_MODES.PRESENTATION).toBe('presentation');
    expect(SPECIAL_MODES.DEBUG).toBe('debug');
    expect(SPECIAL_MODES.SILENT).toBe('silent');
    expect(SPECIAL_MODES.BATCH).toBe('batch');
    expect(SPECIAL_MODES.DAEMON).toBe('daemon');
    expect(SPECIAL_MODES.SERVICE).toBe('service');
  });
});

describe('MODE_META', () => {
  it('is frozen', () => {
    expect(Object.isFrozen(MODE_META)).toBe(true);
  });

  it('has metadata for every mode', () => {
    for (const mode of Object.values(SPECIAL_MODES)) {
      const meta = MODE_META[mode];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.icon).toBeTruthy();
      expect(Array.isArray(meta.affects)).toBe(true);
      expect(meta.affects.length).toBeGreaterThan(0);
    }
  });

  it('each mode has unique label and icon', () => {
    const labels = new Set();
    const icons = new Set();
    for (const meta of Object.values(MODE_META)) {
      labels.add(meta.label);
      icons.add(meta.icon);
    }
    expect(labels.size).toBe(Object.keys(MODE_META).length);
    expect(icons.size).toBe(Object.keys(MODE_META).length);
  });
});

describe('getModeList', () => {
  it('returns all mode values', () => {
    const list = getModeList();
    expect(list).toHaveLength(10);
    expect(list).toContain('learning');
    expect(list).toContain('debug');
    expect(list).toContain('zen');
  });
});

describe('getModeMeta', () => {
  it('returns metadata for a valid mode', () => {
    const meta = getModeMeta('debug');
    expect(meta.label).toBe('Debug');
    expect(meta.description).toContain('Verbose');
  });

  it('returns null for an unknown mode', () => {
    expect(getModeMeta('nonexistent')).toBeNull();
  });
});

describe('describeMode', () => {
  it('returns a human-readable description', () => {
    const desc = describeMode('zen');
    expect(desc).toContain('Zen');
    expect(desc).toContain('Minimal');
  });

  it('returns unknown message for invalid mode', () => {
    expect(describeMode('invalid')).toContain('Unknown mode');
  });
});
