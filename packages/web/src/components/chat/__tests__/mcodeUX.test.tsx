import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { ToolCallCard, StepPulse, GodModeToggle } from '../mcodeUX';

/**
 * Spec §4: the tool-call card picks its icon from the fixed ICONS map and the
 * icon colour is constant (emerald) — only the shape changes per tool type.
 * lucide-react tags every icon with `lucide-<name>` on the rendered <svg>.
 */
describe('ToolCallCard icon contract (spec §4)', () => {
  afterEach(cleanup);

  const cases: Array<[string, string]> = [
    ['explored', 'folder-search'],
    ['searched', 'search'],
    ['ran', 'terminal'],
    ['wrote', 'file-text'],
    ['updated', 'pencil'],
  ];

  for (const [type, icon] of cases) {
    it(`type="${type}" renders lucide-${icon}`, () => {
      const { container } = render(<ToolCallCard type={type} label="x" summary="y" />);
      expect(container.querySelector(`.lucide-${icon}`), `missing lucide-${icon}`).toBeTruthy();
    });
  }

  it('unknown type falls back to FolderSearch', () => {
    const { container } = render(<ToolCallCard type="totally-unknown" label="x" />);
    expect(container.querySelector('.lucide-folder-search')).toBeTruthy();
  });

  it('the icon carries the constant emerald class', () => {
    const { container } = render(<ToolCallCard type="ran" label="Ran" summary="npm test" />);
    const svg = container.querySelector('.lucide-terminal');
    expect(svg?.getAttribute('class')).toContain('text-emerald-400');
  });
});

describe('StepPulse (spec §4/§5)', () => {
  afterEach(cleanup);

  it('renders the 6×6 emerald dot when active', () => {
    const { container } = render(<StepPulse active />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.style.width).toBe('6px');
    expect(dot.style.height).toBe('6px');
    expect(dot.style.background).toContain('--mcode-green');
  });

  it('renders an inert 6×6 spacer when inactive (no layout shift)', () => {
    const { container } = render(<StepPulse active={false} />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.style.width).toBe('6px');
    expect(dot.style.background).toBe('');
  });
});

describe('GodModeToggle (spec §3 — emerald, not purple)', () => {
  afterEach(cleanup);

  it('uses the emerald token when on and no purple/pink anywhere', () => {
    const on = render(<GodModeToggle value onChange={() => {}} />);
    expect(on.container.innerHTML).toContain('emerald-500/10');
    expect(on.container.innerHTML).not.toMatch(/purple|pink/);
    cleanup();
    const off = render(<GodModeToggle value={false} onChange={() => {}} />);
    expect(off.container.innerHTML).not.toMatch(/purple|pink/);
  });

  it('reports the next value through onChange', () => {
    let next: boolean | null = null;
    const { getByRole } = render(<GodModeToggle value={false} onChange={(v) => (next = v)} />);
    (getByRole('button') as HTMLButtonElement).click();
    expect(next).toBe(true);
  });
});
