/**
 * ─────────────────────────────────────────────────────────────
 * OrbitoX Platform Service Settings & Secrets Contract (Phase 6F R4)
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for required environment variables and secrets
 * across ECS Fargate task definitions and runtime startup validators.
 * ─────────────────────────────────────────────────────────────
 */

export interface ServiceSettingsContract {
  environment: readonly string[];
  secrets: readonly string[];
}

export const PLATFORM_SERVICE_CONTRACTS = {
  web: {
    environment: [
      'NODE_ENV',
      'PORT',
      'HOSTNAME',
      'ORBITOX_PUBLIC_BASE_URL',
      'ORBITOX_PLATFORM_REPOSITORY',
      'ORBITOX_ADMIN_TOKEN_SCOPES',
      'ORBITOX_BREACHED_PASSWORD_API',
      'ORBITOX_EMAIL_PROVIDER',
      'ORBITOX_EMAIL_FROM',
      'ORBITOX_PHI_ACTIVE_KID',
      'TRUSTED_PROXIES',
    ],
    secrets: [
      'APP_DATABASE_URL',
      'PLATFORM_ADMIN_AUDIT_DATABASE_URL',
      'HMS_AUDIT_DATABASE_URL',
      'SESSION_SECRET',
      'ORBITOX_ADMIN_TOKEN',
      'ORBITOX_RUNTIME_TOKEN',
      'ORBITOX_CONTROL_SECRET',
      'ORBITOX_GUEST_SECRET',
      'ORBITOX_SERVER_PEPPERS',
      'ORBITOX_SERVER_PEPPER_ACTIVE',
      'ORBITOX_MFA_ENCRYPTION_KEY',
      'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY',
      'ORBITOX_PHI_KEYS',
      'ORBITOX_PHI_INDEX_KEY',
      'ORBITOX_GRANT_SIGNING_KEYS',
      'ORBITOX_DELETION_CERT_KEYS',
      'ORBITOX_EMAIL_WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
      'ORBITOX_BRIDGE_KEYS',
      'ORBITOX_BRIDGE_ACTIVE_KID',
    ],
  },
  worker_email: {
    environment: [
      'NODE_ENV',
      'ORBITOX_PLATFORM_REPOSITORY',
      'ORBITOX_EMAIL_PROVIDER',
      'ORBITOX_EMAIL_FROM',
    ],
    secrets: [
      'OUTBOX_RELAY_DATABASE_URL',
      'RESEND_API_KEY',
      'ORBITOX_EMAIL_WEBHOOK_SECRET',
      'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY',
    ],
  },
  worker_sweep: {
    environment: [
      'NODE_ENV',
      'ORBITOX_PLATFORM_REPOSITORY',
    ],
    secrets: [
      'APP_DATABASE_URL',
      'MAINTENANCE_DATABASE_URL',
    ],
  },
  restaurant_os: {
    environment: [
      'NODE_ENV',
      'PORT',
      'HOSTNAME',
      'RESTAURANTOS_BASE_DOMAIN',
      'RESTAURANTOS_CNAME_TARGET',
      'TRUSTED_PROXIES',
      'RESTAURANTOS_ALLOWED_ORIGINS',
    ],
    secrets: [
      'DATABASE_URL',
      'ORBITOX_BRIDGE_KEYS',
      'ORBITOX_BRIDGE_ACTIVE_KID',
      'ORBITOX_GRANT_PUBLIC_KEYS',
      'STAFF_AUTH_SECRET',
      'RESTAURANT_STATION_SECRETS',
    ],
  },
} as const;

/**
 * External secrets supplied directly by third-party services and manually entered by the owner.
 */
export const EXTERNAL_PROVIDER_SECRETS = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'RESEND_API_KEY',
] as const;

/**
 * Infrastructure connection strings provisioned by AWS RDS and database bootstrap scripts.
 */
export const DATABASE_URL_SECRETS = [
  'APP_DATABASE_URL',
  'PLATFORM_ADMIN_AUDIT_DATABASE_URL',
  'HMS_AUDIT_DATABASE_URL',
  'OUTBOX_RELAY_DATABASE_URL',
  'MAINTENANCE_DATABASE_URL',
  'DATABASE_URL',
] as const;

/**
 * All secrets excluded from automated in-memory random generation.
 */
export const EXTERNAL_SECRETS = [
  ...EXTERNAL_PROVIDER_SECRETS,
  ...DATABASE_URL_SECRETS,
] as const;

/**
 * Computes all non-external, random application secrets required across all service contracts.
 */
export function getGeneratedSecretNames(): string[] {
  const allSecrets = new Set<string>();
  for (const service of Object.values(PLATFORM_SERVICE_CONTRACTS)) {
    for (const secret of service.secrets) {
      allSecrets.add(secret);
    }
  }
  const excludedSet = new Set<string>(EXTERNAL_SECRETS);
  return Array.from(allSecrets)
    .filter((s) => !excludedSet.has(s))
    .sort();
}
