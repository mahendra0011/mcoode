import { useEffect, useState } from 'react';

const subscribers = new Set();
let tickCount = 0;
let intervalId = null;

// Global animation timer runs at 80ms per tick
// 1 tick = 80ms (fast spinner)
// 5 ticks = 400ms (slow dots)
const TICK_RATE_MS = 80;

function tick() {
  tickCount++;
  for (const fn of subscribers) {
    fn(tickCount);
  }
}

function subscribe(fn) {
  subscribers.add(fn);
  if (subscribers.size === 1) {
    intervalId = setInterval(tick, TICK_RATE_MS);
  }
  // Call immediately so new subscribers are instantly in sync
  fn(tickCount);
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

export function useTicker() {
  const [ticks, setTicks] = useState(tickCount);
  
  useEffect(() => {
    return subscribe(setTicks);
  }, []);
  
  return ticks;
}
