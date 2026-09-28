let sentryInitialized = false;
let Sentry = null;

export async function initCrashReporter() {
  const dsn = process.env.MCODE_SENTRY_DSN;
  if (!dsn || sentryInitialized) return null;

  try {
    Sentry = (await import('@sentry/node')).default;
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'production',
      beforeSend(event) {
        if (event.user) delete event.user;
        return event;
      },
    });
    sentryInitialized = true;
    return Sentry;
  } catch {
    return null;
  }
}

export function reportCrash(error, context = {}) {
  if (!Sentry) return;
  try {
    Sentry.captureException(error, { extra: context });
  } catch {}
}

export function setupCrashHooks() {
  if (!Sentry) return;

  process.on('uncaughtException', (err) => {
    reportCrash(err, { type: 'uncaughtException' });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    reportCrash(reason, { type: 'unhandledRejection' });
  });
}
