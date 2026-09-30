'use strict';

/**
 * Desktop configuration.
 *
 * Everything the shell needs to know about *where* the app lives and *which*
 * routes it is allowed to show lives here, so the rules are in one place rather
 * than scattered through the Electron plumbing.
 */

const path = require('node:path');

/**
 * The web UI is served by packages/web (Next.js) on the WEB port.
 *
 * This is NOT the backend port (3100) — the backend only serves /health, /api/*
 * and the /live socket, so pointing the window there yields a 404 instead of the
 * login screen. Start the stack first:
 *   docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
 */
const WEB_PORT = Number(process.env.MCODE_WEB_PORT || 3000);
const APP_URL = `http://localhost:${WEB_PORT}`;

/**
 * First screen on launch.
 *
 * /login — never the marketing homepage. From here the app's own auth flow takes
 * over: LoginPage already redirects to /ai/chat on success
 * (packages/web/src/components/pages/LoginPage.tsx:127).
 */
const INITIAL_PATH = process.env.MCODE_INITIAL_PATH || '/login';

/**
 * Routes the desktop app is allowed to show.
 *
 * The marketing pages (/, /ai, /cli) are deliberately absent. They are blocked
 * two ways because neither alone is sufficient:
 *   1. will-navigate  — catches full page loads (a typed/redirected URL)
 *   2. pushState guard — catches in-app navigation, which is a same-document
 *      history call and therefore does NOT raise will-navigate
 * The guard in installNavigationGuard() covers the case the second one misses;
 * see README.md for why this is done in the shell rather than in the web app.
 */
const ALLOWED_ROUTES = new Set([
  '/login',
  '/signup',
  '/forgot-password',

  '/ai/chat',
  '/mcode',
  '/settings',
  '/sessions',
  '/extensions',
  '/preview',
  '/live',
  '/plugins',
  '/tools',
  '/docs',
  '/commands',
  '/changelog',
]);

/** Routes that exist only to sell the product. Never loadable from the shell. */
const BLOCKED_ROUTES = new Set(['/', '/ai', '/cli']);

const IS_DEV = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

const paths = {
  icon: path.join(__dirname, 'assets', 'icon.png'),
};

module.exports = {
  APP_URL,
  INITIAL_PATH,
  WEB_PORT,
  ALLOWED_ROUTES,
  BLOCKED_ROUTES,
  IS_DEV,
  paths,
};