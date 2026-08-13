import React, { useState, useEffect, useRef } from 'react';

/**
 * WorkingHeader — matches the reference "Working for 5s" line shown
 * above the response while the whole turn is in progress. Separate
 * from ThoughtBlock's own per-block duration — this tracks the entire
 * turn from the moment the user's message is sent until chat:done.
 */
export function WorkingHeader({ done }) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const start = useRef(Date.now());

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setElapsedMs(Date.now() - start.current), 250);
    return () => clearInterval(id);
  }, [done]);

  if (done) return null;

  const seconds = Math.max(0, Math.round(elapsedMs / 1000));
  const label = seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;

  return (
    <div
      style={{
        fontSize: 13,
        color: 'var(--zc-accent, #6c8cff)',
        fontWeight: 500,
        paddingBottom: 8,
        marginBottom: 8,
        borderBottom: '1px solid var(--zc-border, #26272f)',
      }}
    >
      Working for {label}
    </div>
  );
}
