/**
 * Runs once when the Next.js server starts.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env.NODE_ENV !== 'production') return;
  // `next build` also runs with NODE_ENV=production; only validate a real server.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const problems: string[] = [];

  for (const name of ['ORBITOX_CONTROL_SECRET', 'ORBITOX_GUEST_SECRET']) {
    const value = process.env[name]?.trim();
    if (!value) problems.push(`${name} is not set`);
    else if (value.length < 32) problems.push(`${name} must be at least 32 characters`);
  }

  if (problems.length > 0) {
    throw new Error(
      [
        'OrbitoX cannot start: invalid production configuration.',
        ...problems.map((p) => `  - ${p}`),
        'Generate a secret with: openssl rand -hex 32  (see .env.example)',
      ].join('\n'),
    );
  }
}
