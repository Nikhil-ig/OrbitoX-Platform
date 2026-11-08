/**
 * Node.js-only startup logic for OrbitoX.
 * In production it refuses to boot with missing or weak secrets, so a
 * misconfigured deployment fails loudly at startup instead of at first request.
 */
import { assertEmailProviderConfiguration } from './lib/account-email';

export async function registerNode() {
  // Build validation must not depend on a runtime-controlled environment variable.
  if (
    process.argv.some((argument) => argument === 'build' || argument.endsWith('/next-build-worker'))
  )
    return;

  const nodeEnv = (process.env.NODE_ENV || '').trim();
  const isProduction = nodeEnv === 'production' || !nodeEnv;

  if (isProduction) {
    const problems: string[] = [];
    const requiredSecrets = [
      { name: 'ORBITOX_ADMIN_TOKEN', desc: 'Automation-only control-plane service credential' },
      { name: 'ORBITOX_RUNTIME_TOKEN', desc: 'Internal inter-service runtime communication token' },
      {
        name: 'ORBITOX_CONTROL_SECRET',
        desc: 'Master HMAC signing secret for internal principal tokens',
      },
      {
        name: 'ORBITOX_GUEST_SECRET',
        desc: 'Cryptographic secret for ephemeral guest session signing',
      },
      {
        name: 'ORBITOX_MFA_ENCRYPTION_KEY',
        desc: 'Base64-encoded AES-256 key for encrypted MFA secrets',
      },
      {
        name: 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY',
        desc: 'Base64-encoded AES-256 key for encrypted account email tokens',
      },
      {
        name: 'ORBITOX_EMAIL_WEBHOOK_SECRET',
        desc: 'Resend whsec_ signing secret for Svix-verified bounce/complaint webhooks',
      },
      {
        name: 'RAZORPAY_WEBHOOK_SECRET',
        desc: 'HMAC SHA-256 secret for authenticating incoming billing webhook events',
      },
      {
        name: 'RAZORPAY_KEY_SECRET',
        desc: 'Secret key for authenticated Razorpay subscription API calls',
      },
    ];

    for (const secret of requiredSecrets) {
      const value = process.env[secret.name]?.trim();
      if (!value) {
        problems.push(`${secret.name} is not set (${secret.desc})`);
      } else if (value.length < 32) {
        problems.push(`${secret.name} must be at least 32 characters (found ${value.length})`);
      }
    }
    try {
      assertEmailProviderConfiguration(process.env);
    } catch (error) {
      problems.push(error instanceof Error ? error.message : 'Email provider configuration is invalid.');
    }
    if (!process.env.ORBITOX_ADMIN_TOKEN_SCOPES?.split(',').some((scope) => scope.trim())) {
      problems.push(
        'ORBITOX_ADMIN_TOKEN_SCOPES is not set (automation access must be explicitly scoped by method and path)',
      );
    }
    const breachedPasswordApi = (process.env.ORBITOX_BREACHED_PASSWORD_API || 'on')
      .trim()
      .toLowerCase();
    if (!['on', 'off'].includes(breachedPasswordApi)) {
      problems.push('ORBITOX_BREACHED_PASSWORD_API must be set to "on" or "off" when configured');
    }
    const publicBaseUrl = process.env.ORBITOX_PUBLIC_BASE_URL?.trim();
    try {
      if (!publicBaseUrl || new URL(publicBaseUrl).protocol !== 'https:') throw new Error();
    } catch {
      problems.push('ORBITOX_PUBLIC_BASE_URL must be a canonical HTTPS URL for account links');
    }
    if (!/^rzp_(test|live)_[A-Za-z0-9]+$/.test(process.env.RAZORPAY_KEY_ID?.trim() || '')) {
      problems.push('RAZORPAY_KEY_ID must be a valid Razorpay test or live key id');
    }
    for (const keyName of ['ORBITOX_MFA_ENCRYPTION_KEY', 'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY']) {
      const encoded = process.env[keyName]?.trim();
      if (encoded && Buffer.from(encoded, 'base64').length !== 32) {
        problems.push(`${keyName} must be a base64-encoded 32-byte key`);
      }
    }

    // Web session secret validation (Phase 6F B0-3)
    const sessionSecret = process.env.SESSION_SECRET?.trim();
    if (sessionSecret && sessionSecret.length < 32) {
      problems.push(`SESSION_SECRET must be at least 32 characters (found ${sessionSecret.length})`);
    }
    const serverPort = process.env.PORT || '3005';

    // Grant signing keys validation (required in production per Phase 3 G5)
    const grantKeysJson = process.env.ORBITOX_GRANT_SIGNING_KEYS?.trim();
    const grantPrivKey = process.env.ORBITOX_GRANT_PRIVATE_KEY?.trim();
    if (!grantKeysJson && !grantPrivKey) {
      problems.push(
        'ORBITOX_GRANT_SIGNING_KEYS or ORBITOX_GRANT_PRIVATE_KEY is not set (Production grant issuance requires configured Ed25519 signing keys)',
      );
    }

    // Pepper validation (ORBITOX_SERVER_PEPPERS or legacy ORBITOX_SERVER_PEPPER)
    const rawPeppers = process.env.ORBITOX_SERVER_PEPPERS?.trim();
    const legacyPepper = process.env.ORBITOX_SERVER_PEPPER?.trim();
    if (!rawPeppers && !legacyPepper) {
      problems.push(
        'ORBITOX_SERVER_PEPPER is not set (Server pepper for SHA-256 API key verifier derivation)',
      );
    } else if (rawPeppers) {
      try {
        const parsed = JSON.parse(rawPeppers);
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed) ||
          Object.keys(parsed).length === 0
        ) {
          problems.push('ORBITOX_SERVER_PEPPERS must be a non-empty JSON object of {id: secret}');
        }
      } catch {
        problems.push('ORBITOX_SERVER_PEPPERS must be a JSON object of {id: secret}');
      }
    } else if (legacyPepper && legacyPepper.length < 32) {
      problems.push(
        `ORBITOX_SERVER_PEPPER must be at least 32 characters (found ${legacyPepper.length})`,
      );
    }

    const loopbackStandaloneHarness =
      process.env.ORBITOX_TEST_STANDALONE === 'true' &&
      (process.env.HOSTNAME === '127.0.0.1' || process.env.HOSTNAME === 'localhost') &&
      !process.env.VERCEL &&
      !process.env.KUBERNETES_SERVICE_HOST &&
      !process.env.AWS_REGION;
    if (process.env.TEST_STEP5_DELAY_MS && !loopbackStandaloneHarness) {
      problems.push('TEST_STEP5_DELAY_MS is strictly prohibited in production deployments.');
    }

    // PHI encryption keys validation (required in production)
    const phiSecrets = [
      {
        name: 'ORBITOX_PHI_KEYS',
        desc: 'JSON map of kid to 32-byte base64 AES keys for PHI field encryption',
      },
      {
        name: 'ORBITOX_PHI_ACTIVE_KID',
        desc: 'Active key identifier for new PHI encryption operations',
      },
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
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          Array.isArray(parsed) ||
          Object.keys(parsed).length === 0
        ) {
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
      problems.push(
        'APP_DATABASE_URL is not set (Production runtime requires orbitox_runtime role connection)',
      );
    } else {
      try {
        const { prisma } = await import('@/lib/prisma');
        const roleRows = await prisma.$queryRaw<
          Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
        >`
          SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
        `;
        const role = roleRows[0];
        if (
          !role ||
          role.current_user !== 'orbitox_runtime' ||
          role.rolsuper ||
          role.rolbypassrls
        ) {
          problems.push(
            `Database role is unsafe: user="${role?.current_user}", rolsuper=${role?.rolsuper}, rolbypassrls=${role?.rolbypassrls}. Production requires orbitox_runtime with rolsuper=false and rolbypassrls=false.`,
          );
        }
        const activeOwners = await prisma.platformOperator.count({
          where: { role: 'PLATFORM_OWNER', status: 'ACTIVE' },
        });
        if (activeOwners < 1) {
          problems.push(
            'No active PLATFORM_OWNER operator exists. Provision one with the operator:bootstrap command.',
          );
        }
      } catch (dbErr: any) {
        problems.push(`Database connection or role check failed: ${dbErr.message}`);
      }
    }

    // Dedicated HMS Audit reader role check (required in production)
    const hmsAuditUrl = process.env.HMS_AUDIT_DATABASE_URL?.trim();
    if (!hmsAuditUrl) {
      problems.push(
        'HMS_AUDIT_DATABASE_URL is not set (Production audit queries require dedicated hms_audit_reader connection)',
      );
    } else {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const auditClient = new PrismaClient({ datasources: { db: { url: hmsAuditUrl } } });
        const auditRoleRows = await auditClient.$queryRaw<
          Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
        >`
          SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
        `;
        await auditClient.$disconnect();
        const role = auditRoleRows[0];
        if (
          !role ||
          role.current_user !== 'hms_audit_reader' ||
          role.rolsuper ||
          role.rolbypassrls
        ) {
          problems.push(
            `Audit database role is unsafe: user="${role?.current_user}", rolsuper=${role?.rolsuper}, rolbypassrls=${role?.rolbypassrls}. Production requires hms_audit_reader with rolsuper=false and rolbypassrls=false.`,
          );
        }
      } catch (dbErr: any) {
        problems.push(`Audit database connection or role check failed: ${dbErr.message}`);
      }
    }

    // Dedicated Outbox Relay role check (checked when provided, e.g. in outbox worker or integrated runner)
    const outboxRelayUrl = process.env.OUTBOX_RELAY_DATABASE_URL?.trim();
    if (outboxRelayUrl) {
      try {
        const { PrismaClient } = await import('@prisma/client');
        const relayClient = new PrismaClient({ datasources: { db: { url: outboxRelayUrl } } });
        const relayRoleRows = await relayClient.$queryRaw<
          Array<{ current_user: string; rolsuper: boolean; rolbypassrls: boolean }>
        >`
          SELECT current_user, r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user
        `;
        await relayClient.$disconnect();
        const role = relayRoleRows[0];
        if (
          !role ||
          role.current_user !== 'orbitox_outbox_relay' ||
          role.rolsuper ||
          role.rolbypassrls
        ) {
          problems.push(
            `Outbox relay database role is unsafe: user="${role?.current_user}", rolsuper=${role?.rolsuper}, rolbypassrls=${role?.rolbypassrls}. Production requires orbitox_outbox_relay with rolsuper=false and rolbypassrls=false.`,
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
      console.warn(
        'Control plane authentication is bypassed because ALLOW_UNAUTHENTICATED_DEV_MODE is enabled.',
      );
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
          console.log(
            `[OrbitoX Crash Recovery] Resuming interrupted operation ${op.id} on startup...`,
          );
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
