"use client";
import { useCallback, useEffect, useState } from 'react';
import api from '../lib/axios';
import {
  FALLBACK_PROVIDERS,
  type CatalogSource,
  type FallbackProvider,
} from '../lib/providerCatalog';

/**
 * One fetch of the CLI provider catalog, shared by every screen that needs it
 * (audit WEB-029).
 *
 * The backend's `GET /api/v1/settings/providers` is generated from the CLI's own
 * `getAllAdapters()` (`packages/backend/src/routes/settings.js`), so a successful
 * response *is* the authoritative catalog. When it fails, the two consumers
 * (`ApiKeysTab` in SettingsPage and `ModelSelector` in the chat composer) used to
 * silently swap in their **own separate** hard-coded lists, with no indication
 * anything was wrong. They now share `FALLBACK_PROVIDERS` and both report
 * `source: 'fallback'`, so the UI can label the list as not live.
 *
 * `refresh()` is exposed for the "Reload catalog" affordance — without it the
 * user is stuck on a stale list until they reload the whole page.
 */
export function useProviderCatalog() {
  const [providers, setProviders] = useState<FallbackProvider[]>(FALLBACK_PROVIDERS);
  const [source, setSource] = useState<CatalogSource>('fallback');
  const [loading, setLoading] = useState(true);

  const applyLive = (live: unknown): boolean => {
    if (Array.isArray(live) && live.length) {
      setProviders(live as FallbackProvider[]);
      setSource('live');
      return true;
    }
    return false;
  };

  // One-shot load on mount. Guarded against setting state after unmount (the
  // in-flight `/settings/providers` request is not cancellable through axios).
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await api.get('/api/v1/settings/providers', { timeout: 5000 });
        if (!cancelled) applyLive(res.data?.providers);
      } catch {
        // Deliberately keeps FALLBACK_PROVIDERS with source='fallback'. This is
        // a *visible* state now (the screens render CATALOG_STALE_NOTICE), which
        // is the point of WEB-029 — a stale catalog must not look like a real one.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/settings/providers', { timeout: 5000 });
      if (!applyLive(res.data?.providers)) {
        setProviders(FALLBACK_PROVIDERS);
        setSource('fallback');
      }
    } catch {
      setProviders(FALLBACK_PROVIDERS);
      setSource('fallback');
    } finally {
      setLoading(false);
    }
  }, []);

  return { providers, source, loading, refresh, isStale: source === 'fallback' };
}
