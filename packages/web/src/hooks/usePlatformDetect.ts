"use client";
import { useEffect } from 'react';

/**
 * Apply platform-specific CSS classes to document.documentElement,
 * matching mcode's theme system (platform-mac-desktop, platform-windows-desktop,
 * platform-linux-desktop).
 *
 * The CSS classes in index.css gate platform-specific styling
 * (traffic light buttons, caption buttons, window chrome, etc.).
 */
export function usePlatformDetect() {
  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const classes = document.documentElement.classList;

    if (ua.includes('Mac OS X')) {
      classes.add('platform-mac-desktop');
    } else if (ua.includes('Windows NT')) {
      classes.add('platform-windows-desktop');
    } else {
      classes.add('platform-linux-desktop');
    }
  }, []);
}
