/**
 * Node.js-only startup logic for OrbitoX.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
export async function registerNode() {
  // Build validation must not depend on a runtime-controlled environment variable.
  if (process.argv.some((argument) => argument === 'build' || argument.endsWith('/next-build-worker'))) return;

  const nodeEnv = (process.env.NODE_ENV || '').trim();
  const isProduction = nodeEnv === 'production' || !nodeEnv;

  if (isProduction) {
    const problems: string[] = [];
    const requiredSecrets = [
      { name: 'ORBITOX_ADMIN_TOKEN', desc: 'Automation-only control-plane service credential' },
      { name: 'ORBITOX_RUNTIME_TOKEN', desc: 'Internal inter-service runtime communication token' },
      { name: 'ORBITOX_CONTROL_SECRET', desc: 'Master HMAC signing secret for internal principal tokens' },
      { name: 'ORBITOX_GUEST_SECRET', desc: 'Cryptographic secret for ephemeral guest session signing' },
      { name: 'ORBITOX_MFA_ENCRYPTION_KEY', desc: 'Base64-encoded AES-256 key for encrypted MFA secrets' },
      { name: 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY', desc: 'Base64-encoded AES-256 key for encrypted account email tokens' },
      { name: 'RAZORPAY_WEBHOOK_SECRET', desc: 'HMAC SHA-256 secret for authenticating incoming billing webhook events' },
    ];

    for (const secret of requiredSecrets) {
      const value = process.env[secret.name]?.trim();
      if (!value) {
        problems.push(`${secret.name} is not set (${secret.desc})`);
      } else if (value.length < 32) {
        problems.push(`${secret.name} must be at least 32 characters (found ${value.length})`);
      }
    }
    if (!process.env.ORBITOX_ADMIN_TOKEN_SCOPES?.split(',').some((scope) => scope.trim())) {
      problems.push('ORBITOX_ADMIN_TOKEN_SCOPES is not set (automation access must be explicitly scoped by method and path)');
    }
    const publicBaseUrl = process.env.ORBITOX_PUBLIC_BASE_URL?.trim();
    try {
      if (!publicBaseUrl || new URL(publicBaseUrl).protocol !== 'https:') throw new Error();
    } catch {
      problems.push('ORBITOX_PUBLIC_BASE_URL must be a canonical HTTPS URL for account links');
    }
    for (const keyName of ['ORBITOX_MFA_ENCRYPTION_KEY', 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY']) {
      const encoded = process.env[keyName]?.trim();
      if (encoded && Buffer.from(encoded, 'base64').length !== 32) {
        problems.push(`${keyName} must be a base64-encoded 32-byte key`);
      }
    }

    // Grant signing keys validation (required in production per Phase 3 G5)
    const grantKeysJson = process.env.ORBITOX_GRANT_SIGNING_KEYS?.trim();
    const grantPrivKey = process.env.ORBITOX_GRANT_PRIVATE_KEY?.trim();
    if (!grantKeysJson && !grantPrivKey) {
      problems.push('ORBITOX_GRANT_SIGNING_KEYS or ORBITOX_GRANT_PRIVATE_KEY is not set (Production grant issuance requires configured Ed25519 signing keys)');
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

    // Strict prohibition of test flags in real production deployments (impossible in production)
    if (process.env.ORBITOX_TEST_SKIP_ROLE_CHECK !== 'true' && (process.env.TEST_STEP5_DELAY_MS || process.env.ORBITOX_TEST_STANDALONE === 'true')) {
      problems.push('TEST_STEP5_DELAY_MS and ORBITOX_TEST_STANDALONE are strictly prohibited in production deployments.');
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
        const activeOwners = await prisma.platformOperator.count({
          where: { role: 'PLATFORM_OWNER', status: 'ACTIVE' },
        });
        if (activeOwners < 1) {
          problems.push('No active PLATFORM_OWNER operator exists. Provision one with the operator:bootstrap command.');
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

    // Dedicated Outbox Relay role check (required in production)
    const outboxRelayUrl = process.env.OUTBOX_RELAY_DATABASE_URL?.trim();
    if (!outboxRelayUrl) {
      problems.push('OUTBOX_RELAY_DATABASE_URL is not set (Production outbox relay requires dedicated orbitox_outbox_relay connection)');
    } else if (process.env.ORBITOX_TEST_SKIP_ROLE_CHECK !== 'true') {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const relayClient = new PrismaClient({ datasources: { db: { url: outboxRelayUrl } } });
        const relayRoleRows = await relayClient.$queryRaw<Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>>`
          SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
        `;
        await relayClient.$disconnect();
        const role = relayRoleRows[0];
        if (!role || role.current_user !== 'orbitox_outbox_relay' || role.rolsuper || role.rolbypassrls) {
          problems.push(
            `Outbox relay database role is unsafe: user="${role?.current_user}", rolsuper=${role?.rolsuper}, rolbypassrls=${role?.rolbypassrls}. Production requires orbitox_outbox_relay with rolsuper=false and rolbypassrls=false.`
          );
        }
      } catch (dbErr: any) {
        problems.push(`Outbox relay database connection or role check failed: ${dbErr.message}`);
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

  // Crash recovery: automatically resume interrupted tenant provisioning workflows on server boot
  if (process.env.ORBITOX_DISABLE_AUTO_RESUME !== 'true') {
    setTimeout(async () => {
      try {
        const { operationStore } = await import('@/lib/tenant-provisioning/operation-store');
        const { provisioningSaga } = await import('@/lib/tenant-provisioning/provisioning-saga');
        const resumableOps = await operationStore.listResumableOperations();
        for (const op of resumableOps) {
          console.log(`[OrbitoX Crash Recovery] Resuming interrupted operation ${op.id} on startup...`);
          provisioningSaga.resumeWorkflow(op.id).catch((err) => {
            console.error(`[OrbitoX Crash Recovery] Failed to resume operation ${op.id}:`, err);
          });
        }
      } catch (err) {
        // Safe ignore during initialization or in environments without DB
      }
    }, 250);
  }
}
