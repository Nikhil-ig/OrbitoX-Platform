/**
 * 🛡️ RestaurantOS Production Startup Configuration & Validation (Phase 6F B0-8 / B0-9)
 */

export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function assertRestaurantOsProductionConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): void {
  const problems: string[] = [];

  // 1. Database URL
  if (!env.DATABASE_URL || !env.DATABASE_URL.trim()) {
    problems.push('DATABASE_URL is not set (Production requires configured PostgreSQL connection)');
  }

  // 2. STAFF_AUTH_SECRET
  const staffSecret = env.STAFF_AUTH_SECRET?.trim();
  if (
    !staffSecret ||
    staffSecret.length < 32 ||
    staffSecret.includes('default_key') ||
    staffSecret.includes('test_only') ||
    staffSecret === 'orbitox_hospitality_staff_vault_secret_key_v2_2026_test_only_0123456789abcdef'
  ) {
    problems.push('STAFF_AUTH_SECRET must be configured with at least 32 cryptographically strong characters');
  }

  // 3. RESTAURANTOS_BASE_DOMAIN
  if (!env.RESTAURANTOS_BASE_DOMAIN || !env.RESTAURANTOS_BASE_DOMAIN.trim()) {
    problems.push('RESTAURANTOS_BASE_DOMAIN is not set (Production subdomain routing requires base domain)');
  }

  // 4. RESTAURANTOS_CNAME_TARGET
  if (!env.RESTAURANTOS_CNAME_TARGET || !env.RESTAURANTOS_CNAME_TARGET.trim()) {
    problems.push('RESTAURANTOS_CNAME_TARGET is not set (Custom domain routing requires CNAME target)');
  }

  // 5. TRUSTED_PROXIES
  if (!env.TRUSTED_PROXIES || !env.TRUSTED_PROXIES.trim()) {
    problems.push('TRUSTED_PROXIES is not set (ALB reverse proxy requires CIDR configuration)');
  }

  // 6. RESTAURANTOS_ALLOWED_ORIGINS
  if (!env.RESTAURANTOS_ALLOWED_ORIGINS || !env.RESTAURANTOS_ALLOWED_ORIGINS.trim()) {
    problems.push('RESTAURANTOS_ALLOWED_ORIGINS is not set (CORS policy requires explicit allowed origins)');
  }

  // 7. RESTAURANT_STATION_SECRETS
  const stationSecrets = env.RESTAURANT_STATION_SECRETS?.trim();
  if (!stationSecrets) {
    problems.push('RESTAURANT_STATION_SECRETS is not set (Production kitchen hardware requires configured station secrets)');
  } else {
    try {
      const parsed = JSON.parse(stationSecrets);
      if (typeof parsed !== 'object' || parsed === null || Object.keys(parsed).length === 0) {
        problems.push('RESTAURANT_STATION_SECRETS must be a non-empty JSON object');
      }
    } catch {
      const pairs = stationSecrets.split(',');
      if (pairs.length === 0 || !pairs.every((p) => p.includes(':'))) {
        problems.push('RESTAURANT_STATION_SECRETS must be valid JSON or comma-separated pairs');
      }
    }
  }

  // 8. RESTAURANT_GSTIN
  const gstin = env.RESTAURANT_GSTIN?.trim();
  if (!gstin || !GSTIN_REGEX.test(gstin)) {
    problems.push(`RESTAURANT_GSTIN must be a valid 15-character Indian GSTIN (found "${gstin || ''}")`);
  }

  // 9. ORBITOX_BRIDGE_KEYS
  if (!env.ORBITOX_BRIDGE_KEYS || !env.ORBITOX_BRIDGE_KEYS.trim()) {
    problems.push('ORBITOX_BRIDGE_KEYS is not set (Platform-to-runtime bridge authentication requires keys)');
  }

  // 10. ORBITOX_GRANT_PUBLIC_KEYS
  if (!env.ORBITOX_GRANT_PUBLIC_KEYS || !env.ORBITOX_GRANT_PUBLIC_KEYS.trim()) {
    problems.push('ORBITOX_GRANT_PUBLIC_KEYS is not set (Plugin entitlement verification requires public keys)');
  }

  if (problems.length > 0) {
    throw new Error(
      `🚨 [SECURITY FATAL] RestaurantOS production configuration errors detected:\n${problems.map((p) => `  - ${p}`).join('\n')}`
    );
  }
}
