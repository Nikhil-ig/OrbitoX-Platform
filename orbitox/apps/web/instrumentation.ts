/**
 * Runs once when the Next.js server starts.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    let registerNode: any;
    try {
      ({ registerNode } = await import('./instrumentation.node'));
    } catch {
      const tsTarget = './instrumentation.node' + '.ts';
      ({ registerNode } = await (import(/* webpackIgnore: true */ tsTarget) as Promise<any>));
    }
    if (registerNode) {
      await registerNode();
    }
  }
}
