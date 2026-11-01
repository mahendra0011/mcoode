// @ts-nocheck — OpenTUI JSX/hook
import { useEffect, useRef } from 'react';
import { useRenderer } from '@opentui/react';
import { sanitizePasteText } from './clipboard.js';

/**
 * Hook to listen for terminal paste events (bracketed paste) across OpenTUI components.
 * When a terminal receives pasted text (via right-click, Shift+Insert, or Ctrl+V in terminal),
 * OpenTUI emits a 'paste' event on its keyHandler/keyInput.
 */
export function usePaste(onPaste, enabled = true) {
  let renderer = null;
  try {
    renderer = useRenderer();
  } catch {
    // Outside OpenTUI context or testing
  }

  const onPasteRef = useRef(onPaste);
  onPasteRef.current = onPaste;

  useEffect(() => {
    if (!enabled || !renderer?.keyInput) return;

    const handlePaste = (event) => {
      let raw = '';
      if (event?.bytes) {
        try {
          raw = new TextDecoder('utf-8').decode(event.bytes);
        } catch {
          raw = Buffer.from(event.bytes).toString('utf8');
        }
      } else if (typeof event?.text === 'string') {
        raw = event.text;
      }
      const clean = sanitizePasteText(raw);
      if (clean && onPasteRef.current) {
        onPasteRef.current(clean);
      }
    };

    renderer.keyInput.on('paste', handlePaste);
    return () => {
      renderer.keyInput.off('paste', handlePaste);
    };
  }, [renderer, enabled]);
}

