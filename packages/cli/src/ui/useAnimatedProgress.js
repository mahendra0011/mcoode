import { useState, useEffect } from 'react';

export function useAnimatedProgress(targetPct, frames = 8, intervalMs = 20) {
  const [displayPct, setDisplayPct] = useState(targetPct);
  
  useEffect(() => {
    if (displayPct === targetPct) return;
    
    const start = displayPct;
    const delta = targetPct - start;
    let frame = 0;
    
    const id = setInterval(() => {
      frame++;
      setDisplayPct(start + delta * (frame / frames));
      if (frame >= frames) clearInterval(id);
    }, intervalMs);
    
    return () => clearInterval(id);
  }, [targetPct, displayPct, frames, intervalMs]);
  
  return displayPct;
}
