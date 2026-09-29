/**
 * One reporting path for failures (audit WEB-015).
 *
 * The web app had ~30 `catch {}` blocks that answered "nothing happened" for
 * things that *did* happen: uploads that silently half-failed, Monaco models
 * that leaked, terminals that were dead but looked empty, settings that were
 * optimistically shown as saved. Silent catches also defeat the e2e suite —
 * "nothing" is a valid-looking state for a Playwright assertion to pass against.
 *
 * Use this instead of an empty catch:
 *   catch (err) { reportError('folder upload', err); }                       // user-visible toast
 *   catch (err) { reportError('localStorage quota', err, { userVisible: false }); } // console only
 *
 * `packages/web/tests/no-silent-catches.test.js` fails CI when a new empty catch
 * appears, so the difference between "handled" and "hidden" stays visible.
 */
import { toast } from 'sonner';

export interface ReportOptions {
  /** Show a toast (default true). Use false for expected/handled fallbacks. */
  userVisible?: boolean;
  /** Extra context appended to the message. */
  detail?: string;
}

export function reportError(scope: string, err: unknown, options: ReportOptions = {}): void {
  const { userVisible = true, detail } = options;
  const message = err instanceof Error ? err.message : String(err ?? 'unknown error');

  // Always keep the console trail — this is what a developer actually needs.
  console.error(`[${scope}]`, err);

  if (!userVisible || typeof window === 'undefined') return;
  try {
    toast.error(`${scope} failed`, { description: detail ? `${detail} — ${message}` : message });
  } catch {
    // Toast provider not mounted (e.g. during SSR or a test render). The
    // console.error above is the fallback; never let reporting throw.
  }
}

/**
 * Report an error the user caused and can fix (validation, missing file, …).
 * Same channel, clearer wording — kept separate so the intent is greppable.
 */
export function reportUserError(scope: string, message: string): void {
  console.warn(`[${scope}]`, message);
  if (typeof window === 'undefined') return;
  try {
    toast.error(scope, { description: message });
  } catch {
    /* see reportError */
  }
}
