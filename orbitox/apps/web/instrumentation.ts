/**
 * Runs once when the Next.js server starts.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  // Build validation must not depend on a runtime-controlled environment variable.
  if (process.argv.some((argument) => argument === 'build' || argument.endsWith('/next-build-worker'))) return;

  const nodeEnv = (process.env.NODE_ENV || '').trim();
  const isProduction = nodeEnv === 'production' || !nodeEnv;

  if (isProduction) {
    const problems: string[] = [];
    const requiredSecrets = [
      { name: 'ORBITOX_ADMIN_TOKEN', desc: 'Master credential for control plane & management APIs' },
      { name: 'ORBITOX_RUNTIME_TOKEN', desc: 'Internal inter-service runtime communication token' },
      { name: 'ORBITOX_CONTROL_SECRET', desc: 'Master HMAC signing secret for internal principal tokens' },
      { name: 'ORBITOX_GUEST_SECRET', desc: 'Cryptographic secret for ephemeral guest session signing' },
    ];

    for (const secret of requiredSecrets) {
      const value = process.env[secret.name]?.trim();
      if (!value) {
        problems.push(`${secret.name} is not set (${secret.desc})`);
      } else if (value.length < 32) {
        problems.push(`${secret.name} must be at least 32 characters (found ${value.length})`);
      }
    }

    // Pepper validation (ORBITOX_SERVER_PEPPERS or legacy ORBITOX_SERVER_PEPPER)
    const rawPeppers = process.env.ORBITOX_SERVER_PEPPERS?.trim();
    const legacyPepper = process.env.ORBITOX_SERVER_PEPPER?.trim();
    if (!rawPeppers && !legacyPepper) {
      problems.push('ORBITOX_SERVER_PEPPER is not set (Server pepper for SHA-256 API key verifier derivation)');
    } else if (rawPeppers) {
      try {
        const parsed = JSON.parse(rawPeppers);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length === 0) {
          problems.push('ORBITOX_SERVER_PEPPERS must be a non-empty JSON object of {id: secret}');
        }
      } catch {
        problems.push('ORBITOX_SERVER_PEPPERS must be a JSON object of {id: secret}');
      }
    } else if (legacyPepper && legacyPepper.length < 32) {
      problems.push(`ORBITOX_SERVER_PEPPER must be at least 32 characters (found ${legacyPepper.length})`);
    }

    // In CI or test environments where standalone test harnesses boot without PHI env,
    // supply synthetic keys if unset so standalone control-plane smoke suites can run.
    if ((process.env.CI === 'true' || process.env.ORBITOX_TEST_STANDALONE === 'true') && !process.env.ORBITOX_PHI_KEYS) {
      process.env.ORBITOX_PHI_KEYS = JSON.stringify({
        k1: Buffer.alloc(32, 1).toString('base64'),
      });
      process.env.ORBITOX_PHI_ACTIVE_KID = 'k1';
      process.env.ORBITOX_PHI_INDEX_KEY = Buffer.alloc(32, 2).toString('base64');
    }

    // PHI encryption keys validation (required in production)
    const phiSecrets = [
      { name: 'ORBITOX_PHI_KEYS', desc: 'JSON map of kid to 32-byte base64 AES keys for PHI field encryption' },
      { name: 'ORBITOX_PHI_ACTIVE_KID', desc: 'Active key identifier for new PHI encryption operations' },
      { name: 'ORBITOX_PHI_INDEX_KEY', desc: '32-byte base64 HMAC key for blind index generation' },
    ];
    for (const secret of phiSecrets) {
      const value = process.env[secret.name]?.trim();
      if (!value) {
        problems.push(`${secret.name} is not set (${secret.desc})`);
      }
    }
    const rawPhiKeys = process.env.ORBITOX_PHI_KEYS?.trim();
    if (rawPhiKeys) {
      try {
        const parsed = JSON.parse(rawPhiKeys);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || Object.keys(parsed).length === 0) {
          problems.push('ORBITOX_PHI_KEYS must be a non-empty JSON object');
        } else {
          const activeKid = process.env.ORBITOX_PHI_ACTIVE_KID?.trim();
          if (activeKid && !parsed[activeKid]) {
            problems.push(`active PHI kid "${activeKid}" not found in ORBITOX_PHI_KEYS`);
          }
        }
      } catch {
        problems.push('ORBITOX_PHI_KEYS must be valid JSON');
      }
    }

    // Database runtime role check (required in production)
    const appDbUrl = process.env.APP_DATABASE_URL?.trim();
    if (!appDbUrl) {
      problems.push('APP_DATABASE_URL is not set (Production runtime requires orbitox_runtime role connection)');
    } else if (process.env.ORBITOX_TEST_SKIP_ROLE_CHECK !== 'true') {
      try {
        const { prisma } = await import('@/lib/prisma');
        const roleRows = await prisma.$queryRaw<Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>>`
          SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
        `;
        const role = roleRows[0];
        if (!role || role.current_user !== 'orbitox_runtime' || role.rolsuper || role.rolbypassrls) {
          problems.push(
            `Database role is unsafe: user="${role?.current_user}", rolsuper=${role?.rolsuper}, rolbypassrls=${role?.rolbypassrls}. Production requires orbitox_runtime with rolsuper=false and rolbypassrls=false.`
          );
        }
      } catch (dbErr: any) {
        problems.push(`Database connection or role check failed: ${dbErr.message}`);
      }
    }

    // Dedicated HMS Audit reader role check (required in production)
    const hmsAuditUrl = process.env.HMS_AUDIT_DATABASE_URL?.trim();
    if (!hmsAuditUrl) {
      problems.push('HMS_AUDIT_DATABASE_URL is not set (Production audit queries require dedicated hms_audit_reader connection)');
    } else if (process.env.ORBITOX_TEST_SKIP_ROLE_CHECK !== 'true') {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const auditClient = new PrismaClient({ datasources: { db: { url: hmsAuditUrl } } });
        const auditRoleRows = await auditClient.$queryRaw<Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>>`
          SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
        `;
        await auditClient.$disconnect();
        const role = auditRoleRows[0];
        if (!role || role.current_user !== 'hms_audit_reader' || role.rolsuper || role.rolbypassrls) {
          problems.push(
            `Audit database role is unsafe: user="${role?.current_user}", rolsuper=${role?.rolsuper}, rolbypassrls=${role?.rolbypassrls}. Production requires hms_audit_reader with rolsuper=false and rolbypassrls=false.`
          );
        }
      } catch (dbErr: any) {
        problems.push(`Audit database connection or role check failed: ${dbErr.message}`);
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
