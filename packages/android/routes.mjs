/**
 * Route policy for the Android app.
 *
 * The Windows shell (packages/desktop) allows 15 routes because a desktop user
 * is a developer who may want the reference pages. A phone is not that, and the
 * CLI in particular cannot work there at all: `mcode` is a Node program that
 * runs in a terminal, and an Android app has no terminal to spawn it into.
 *
 * So the Android build ships a deliberately short list — auth, the three core
 * screens, and the supporting screens those three need.
 *
 * Anything not listed here is unreachable: the guard below blocks hard
 * navigations, and the injected script blocks in-app `pushState` navigation
 * (which is how Next.js router.push moves around, and how the Cmd+K command
 * palette reaches the marketing pages).
 */

/** The three screens this app exists for. */
export const CORE_SCREENS = ['/ai/chat', '/mcode'];

/** Auth — how you get in. */
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password'];

/** Supporting screens the core ones navigate to. */
const SUPPORT_ROUTES = [
  '/settings',
  '/sessions',
  '/extensions',
  '/preview',
];

/** Everything the app will open. */
export const ALLOWED_ROUTES = [...AUTH_ROUTES, ...CORE_SCREENS, ...SUPPORT_ROUTES];

/**
 * Explicitly blocked, called out so the reason survives future edits:
 *   /          marketing homepage
 *   /ai        AI marketing page
 *   /cli       CLI product page — the CLI is Windows/terminal-only
 *   /commands  CLI + slash-command reference
 *   /plugins   plugin management, driven by `mcode add` / `mcode plugin …`
 *   /tools     tool catalogue (reference page)
 *   /docs      documentation, cross-links the CLI throughout
 *   /changelog release notes
 *   /live      subagent watch monitor (desktop developer tool)
 */
export const BLOCKED_ROUTES = [
  '/',
  '/ai',
  '/cli',
  '/commands',
  '/plugins',
  '/tools',
  '/docs',
  '/changelog',
  '/live',
];
