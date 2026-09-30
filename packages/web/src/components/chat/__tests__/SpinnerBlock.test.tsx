import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { SpinnerBlock } from '../SpinnerBlock';

/**
 * SpinnerBlock is the shared terminal spinner (spec §4/§5): five frames
 * ● ◐ ◓ ◑ ◒ advancing every 80ms — the same rate as the CLI's useTicker.
 */
describe('SpinnerBlock (spec §4/§5)', () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('advances exactly one frame per 80ms tick', () => {
    vi.useFakeTimers();
    const { container } = render(<SpinnerBlock label="" size="sm" color="emerald" active />);
    const frameOf = () => ['●', '◐', '◓', '◑', '◒'].find((f) => (container.textContent || '').includes(f));

    const f0 = frameOf();
    expect(f0, 'first frame is not part of the 5-frame set').toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(80);
    });
    const f1 = frameOf();
    expect(f1).not.toBe(f0);

    act(() => {
      vi.advanceTimersByTime(80 * 4); // four more ticks → back to frame 0
    });
    expect(frameOf()).toBe(f0);
  });

  it('renders the label and defaults to the emerald token', () => {
    vi.useFakeTimers();
    const { container } = render(<SpinnerBlock label="Running…" />);
    expect(screen.getByText('Running…')).toBeTruthy();
    expect(container.innerHTML).toContain('--mcode-green');
  });

  it('does not tick when inactive', () => {
    vi.useFakeTimers();
    const { container } = render(<SpinnerBlock label="" active={false} />);
    const f0 = container.textContent;
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(container.textContent).toBe(f0);
  });
});
