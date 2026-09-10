"use client";
import { usePlatformDetect } from '../../hooks/usePlatformDetect';

/** Applies platform CSS classes to document.documentElement. */
export function PlatformDetect() {
  usePlatformDetect();
  return null;
}
