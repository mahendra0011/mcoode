import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { AgentActionSequence } from '../AgentActionSequence';

/**
 * AgentActionSequence is the ONLY thing that may render while a turn is in
 * flight (spec §1). It must never invent a phase: no “Analyzing workspace”,
 * no “Scanning files” — just “Thinking” (or a real backend statusLabel), the
 * pulse dot, the brain icon, the spinner and the elapsed counter.
 */
describe('AgentActionSequence (spec §1 — never fabricate progress)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('shows “Thinking” + elapsed seconds by default', () => {
    render(<AgentActionSequence startedAt={Date.now()} />);
    expect(screen.getByText('Thinking')).toBeTruthy();
    expect(screen.getByText('1s')).toBeTruthy();
  });

  it('never renders an invented phase label', () => {
    const { container } = render(<AgentActionSequence startedAt={Date.now()} />);
    const text = container.textContent || '';
    for (const forbidden of ['Analyzing', 'Scanning', 'Searching', 'Reading files', 'Connecting']) {
      expect(text, `invented phase "${forbidden}" leaked into the indicator`).not.toContain(forbidden);
    }
  });

  it('a real backend statusLabel always wins over the default', () => {
    render(<AgentActionSequence startedAt={Date.now()} statusLabel="Running: read_file" />);
    expect(screen.getByText('Running: read_file')).toBeTruthy();
    expect(screen.queryByText('Thinking')).toBeNull();
  });

  it('the elapsed counter ticks with real time', () => {
    render(<AgentActionSequence startedAt={Date.now()} />);
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByText('4s')).toBeTruthy();
  });

  it('renders the spinner frame from the 80ms 5-frame set', () => {
    const { container } = render(<AgentActionSequence startedAt={Date.now()} />);
    expect(['●', '◐', '◓', '◑', '◒'].some((f) => (container.textContent || '').includes(f))).toBe(true);
  });
});
