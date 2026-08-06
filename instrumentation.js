export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('./lib/env');
    validateEnv();
    const { initSentry } = await import('./lib/monitoring/sentry');
    await initSentry();
  }
}
