/**
 * Runs once when the Next.js server starts.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerNode } = await import('./instrumentation.node');
    await registerNode();
  }
}
