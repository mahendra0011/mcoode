import * as Sentry from '@sentry/node';
export function initSentry() {
  if (!process.env.SENTRY_DSN) return;
  Sentry.init(/** @type {any} */ ({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
  }));
}
export { Sentry };
