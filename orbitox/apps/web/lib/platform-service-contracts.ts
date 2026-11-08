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
      'ORBITOX_SERVER_PEPPER',
      'ORBITOX_MFA_ENCRYPTION_KEY',
      'ORBITOX_ACCOUNT_TOKEN_ENCRYPTION_KEY',
      'ORBITOX_PHI_KEYS',
      'ORBITOX_PHI_INDEX_KEY',
      'ORBITOX_GRANT_SIGNING_KEYS',
      'ORBITOX_EMAIL_WEBHOOK_SECRET',
      'RESEND_API_KEY',
      'RAZORPAY_KEY_ID',
      'RAZORPAY_KEY_SECRET',
      'RAZORPAY_WEBHOOK_SECRET',
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
    ],
    secrets: [
      'DATABASE_URL',
    ],
  },
} as const;
