import { useState, useEffect } from 'react';
import { useTicker } from './useTicker.js';

/**
 * Returns the number of visible lines/elements, progressively revealing them
 * character-by-character or line-by-line using the shared ticker.
 * 
 * @param {number} totalItems The total number of items to reveal.
 * @param {number} ticksPerItem How many 80ms ticks before revealing the next item. (e.g. 0.375 = ~30ms)
 * @param {any} resetKey An optional dependency to force reset the animation when changed.
 * @returns {number} The current number of visible items.
 */
export function useEntrance(totalItems, ticksPerItem = 1, resetKey = null) {
  const ticks = useTicker();
  const [startTick, setStartTick] = useState(null);

  useEffect(() => {
    // Reset when totalItems changes significantly, on mount, or when resetKey changes
    setStartTick(ticks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalItems > 0, resetKey]);

  if (startTick === null) return 0;
  
  const elapsed = ticks - startTick;
  const visible = Math.floor(elapsed / ticksPerItem);
  
  return Math.min(totalItems, visible);
}
