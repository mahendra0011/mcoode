/** Lazy component loader for heavy UI components.
 * Reduces initial load time by deferring non-critical component imports.
 */
import { createElement, useState, useEffect } from 'react';

/** Wrap a dynamically imported component so it renders null while loading.
 * Usage: <LazyComponent file="./AnalyticsPanel.jsx" component="AnalyticsPanel" />
 */
export function LazyWrapper({ file, component, fallback = null, props }) {
  const [Mod, setMod] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import(file).then((mod) => {
      if (!cancelled) setMod(mod);
    });
    return () => { cancelled = true; };
  }, [file]);

  if (!Mod) return fallback;
  const Cmp = Mod[component];
  return Cmp ? createElement(Cmp, props) : fallback;
}

/** Create a lazy component factory for a given module path and export name. */
export function lazyComponent(file, exportName = null) {
  const Resolved = exportName;
  const displayName = Resolved || `Lazy(${file})`;

  function Lazy(props) {
    const [Cmp, setCmp] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
      let cancelled = false;

      import(file)
        .then((mod) => {
          if (cancelled) return;
          const resolved = exportName ? mod[exportName] : (mod.default || mod);
          if (resolved) setCmp(() => resolved);
        })
        .catch((err) => {
          if (!cancelled) setError(err);
        });

      return () => { cancelled = true; };
    }, [file]);

    if (error) {
      console.error(`[lazy] Failed to load ${file}:`, error.message);
      return null;
    }

    return Cmp ? createElement(Cmp, props) : null;
  }

  Lazy.displayName = displayName;
  return Lazy;
}
