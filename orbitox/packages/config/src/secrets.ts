import * as crypto from 'crypto';

export interface SecretOptions {
  minBytes?: number;
}

const KNOWN_BAD_PLACEHOLDERS = [
  'default_secret',
  'mock',
  'changeme',
  'orbitox_*_2026',
  'orbitox_platform_control_secret_2026',
  'orbitox_default_secure_hmac_secret_key_2026',
  'orbitox_hospitality_staff_vault_secret_key_v2_2026_test_only_0123456789abcdef',
  'test_only',
  'default_key',
  'password',
  'secret',
];

const ephemeralDevSecrets = new Map<string, string>();

/**
 * Validates and retrieves a required secret from environment variables.
 *
 * Rules:
 * 1. Reads process.env[name].
 * 2. Throws at startup if missing, shorter than minBytes, or matching known-bad placeholders.
 * 3. Never returns static fallbacks.
 * 4. ALLOW_DEV_SECRETS=1 is honored ONLY when NODE_ENV === 'development'. When enabled,
 *    it generates an ephemeral, random per-process secret (never constant) and logs a warning.
 */
export function requireSecret(name: string, options?: SecretOptions): string {
  const minBytes = options?.minBytes ?? 16;
  const val = process.env[name];

  const isDev = process.env.NODE_ENV === 'development';
  const allowDev = process.env.ALLOW_DEV_SECRETS === '1';

  // Check if val is a known bad placeholder
  const isBadPlaceholder = (secretVal: string): boolean => {
    const lower = secretVal.toLowerCase().trim();
    if (lower.startsWith('orbitox_') && lower.endsWith('_2026')) {
      return true;
    }
    return KNOWN_BAD_PLACEHOLDERS.some((bad) => {
      if (bad.includes('*')) {
        const regex = new RegExp(`^${bad.replace(/\*/g, '.*')}$`, 'i');
        return regex.test(lower);
      }
      return lower === bad.toLowerCase();
    });
  };

  if (!val || Buffer.byteLength(val, 'utf8') < minBytes || isBadPlaceholder(val)) {
    if (isDev && allowDev) {
      let devSecret = ephemeralDevSecrets.get(name);
      if (!devSecret) {
        devSecret = crypto.randomBytes(Math.max(minBytes, 32)).toString('hex');
        ephemeralDevSecrets.set(name, devSecret);
      }
      console.warn(
        `⚠️ [SECURITY WARNING] Using ephemeral in-memory secret for ${name} because ALLOW_DEV_SECRETS=1 in development mode.`
      );
      return devSecret;
    }

    if (!val) {
      throw new Error(`[SECURITY FATAL] Required environment secret "${name}" is not set.`);
    }

    if (isBadPlaceholder(val)) {
      throw new Error(
        `[SECURITY FATAL] Secret "${name}" is set to a prohibited insecure placeholder value.`
      );
    }

    throw new Error(
      `[SECURITY FATAL] Secret "${name}" length (${Buffer.byteLength(val, 'utf8')} bytes) does not meet minimum entropy requirement of ${minBytes} bytes.`
    );
  }

  return val;
}
