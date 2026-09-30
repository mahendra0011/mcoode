/**
 * The script injected into the Android WebView after every page load.
 *
 * Job: keep the app inside ALLOWED_ROUTES. The marketing pages and every
 * CLI-related screen are refused, so a phone user never lands on a page they
 * cannot use — the CLI needs a terminal, and an Android app has none.
 *
 * This lives in the shell rather than in packages/web so the web app keeps no
 * Android-specific code, mirroring how the Windows shell keeps its guard in
 * packages/desktop/guards.js.
 *
 * The route-list placeholders in this file are substituted at runtime from
 * routes.mjs — see build-guard.mjs, which owns the single source of truth.
 */

(function () {
  'use strict';

  var ALLOWED = __ALLOWED__;
  var BLOCKED = __BLOCKED__;

  function normalise(url) {
    try {
      var p = new URL(url, window.location.origin).pathname.replace(/\/+$/, '');
      return p === '' ? '/' : p;
    } catch (e) {
      return null;
    }
  }

  function isAllowed(url) {
    var route = normalise(url);
    if (route === null) return false;
    if (BLOCKED.indexOf(route) !== -1) return false;
    if (ALLOWED.indexOf(route) !== -1) return true;
    // /sessions/<id> is a real screen.
    return route.indexOf('/sessions/') === 0;
  }

  ['pushState', 'replaceState'].forEach(function (name) {
    var original = history[name];
    if (typeof original !== 'function') return;

    history[name] = function (state, title, url) {
      if (url != null && !isAllowed(String(url))) return null;
      return original.apply(this, arguments);
    };
  });
})();
