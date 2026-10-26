/**
 * Runs once when the Next.js server starts.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // `next build` also runs with NODE_ENV=production; only validate a real server.
  if (process.env.NEXT_PHASE === 'phase-production-build') return;

  const nodeEnv = (process.env.NODE_ENV || '').trim();
  const isProduction = nodeEnv === 'production' || !nodeEnv;

  if (isProduction) {
    const problems: string[] = [];
    const requiredSecrets = [
      { name: 'ORBITOX_ADMIN_TOKEN', desc: 'Master credential for control plane & management APIs' },
      { name: 'ORBITOX_RUNTIME_TOKEN', desc: 'Internal inter-service runtime communication token' },
      { name: 'ORBITOX_CONTROL_SECRET', desc: 'Master HMAC signing secret for internal principal tokens' },
      { name: 'ORBITOX_GUEST_SECRET', desc: 'Cryptographic secret for ephemeral guest session signing' },
      { name: 'ORBITOX_SERVER_PEPPER', desc: 'Server pepper for SHA-256 API key verifier derivation' },
    ];

    for (const secret of requiredSecrets) {
      const value = process.env[secret.name]?.trim();
      if (!value) {
        problems.push(`${secret.name} is not set (${secret.desc})`);
      } else if (value.length < 32) {
        problems.push(`${secret.name} must be at least 32 characters (found ${value.length})`);
      }
    }

    if (problems.length > 0) {
      throw new Error(
        [
          'OrbitoX cannot start: invalid production configuration.',
          ...problems.map((p) => `  - ${p}`),
          '',
          'Generate strong 32-character secrets using: openssl rand -hex 32',
          'Or run: node scripts/check-production-env.mjs',
        ].join('\n'),
      );
    }
  } else {
    // Development or test environment
    if (process.env.ALLOW_UNAUTHENTICATED_DEV_MODE === 'true') {
      console.warn('\n' + '='.repeat(80));
      console.warn('⚠️  SECURITY WARNING: RUNNING WITH ALLOW_UNAUTHENTICATED_DEV_MODE=true');
      console.warn('Control plane authentication is bypassed because ALLOW_UNAUTHENTICATED_DEV_MODE is enabled.');
      console.warn('NEVER deploy this configuration to staging or production!');
      console.warn('='.repeat(80) + '\n');
    }
  }
}
