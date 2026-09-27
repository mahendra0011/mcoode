import { describe, it, expect } from 'vitest';
import { cn } from '../src/lib/utils.js';

// WEB-003: first web unit tests (pure class-name helper — no DOM needed).
describe('cn()', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('ignores falsy inputs', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('merges conflicting tailwind classes (last wins)', () => {
    expect(cn('px-2 px-4')).toBe('px-4');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles conditional object syntax', () => {
    expect(cn({ active: true, hidden: false })).toBe('active');
  });
});
