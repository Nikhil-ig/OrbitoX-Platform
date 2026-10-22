import * as crypto from 'crypto';

export interface KeyRiskInput {
  isProduction?: boolean;
  capabilities: string[];
  expiresAt?: string | null;
  issuedAt?: string | null;
  lastUsedAt?: string | null;
  ipAllowlist?: string[] | null;
}

export interface StructuredRiskFactor {
  code: string;
  weight: number;
  message: string;
}

export interface KeyRiskEvaluation {
  score: number; // 0 - 100
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: StructuredRiskFactor[];
}

export interface GeneratedKeyResult {
  keyId: string;
  rawSecret: string; // Shown ONCE to user, NEVER stored in DB
  keyPrefix: string;
  secretFingerprint: string; // SHA-256 for display
  authVerifier: string; // HMAC-SHA-256 for DB authentication
  maskedDisplay: string; // orb_live_••••••••0zE
}

const BASE62_CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function bufferToBase62(buffer: Buffer): string {
  let result = '';
  for (let i = 0; i < buffer.length; i++) {
    result += BASE62_CHARS[buffer[i]! % BASE62_CHARS.length];
  }
  return result;
}

export class PlatformKeyEngine {
  private static readonly DEFAULT_PEPPER = 'orbitox-cluster-server-pepper-v3-zero-trust';

  /**
   * Generates a complete, cryptographically secure machine API key.
   * Emits CSPRNG entropy, public handle, display fingerprint, and HMAC authentication verifier.
   */
  static generateKey(
    environment: 'production' | 'staging' | 'development' | string = 'production',
    serverPepper?: string
  ): GeneratedKeyResult {
    const envNormalized =
      environment === 'production'
        ? 'live'
        : environment === 'staging'
        ? 'stage'
        : 'test';

    const keyPrefix = `orb_${envNormalized}_`;

    // 256 bits of high-entropy CSPRNG bytes
    const randomEntropy = crypto.randomBytes(32);
    const secretEntropy = bufferToBase62(randomEntropy);
    const rawSecret = `${keyPrefix}${secretEntropy}`;

    // Public Key Identifier
    const keyId = `key_${envNormalized}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    // Display Fingerprint: SHA-256(rawSecret)
    const secretFingerprint = this.computeFingerprint(rawSecret);

    // Authentication Verifier: HMAC-SHA-256(pepper, rawSecret)
    const authVerifier = this.computeAuthVerifier(rawSecret, serverPepper);

    // Masked Display representation
    const maskedDisplay = this.createMaskedDisplay(rawSecret);

    return {
      keyId,
      rawSecret,
      keyPrefix,
      secretFingerprint,
      authVerifier,
      maskedDisplay,
    };
  }

  /**
   * Computes human-verifiable SHA-256 display fingerprint.
   * e.g., "SHA256: 9F2A...81C7"
   */
  static computeFingerprint(rawSecret: string): string {
    const fullHash = crypto.createHash('sha256').update(rawSecret).digest('hex').toUpperCase();
    return `SHA256: ${fullHash.slice(0, 4)}:${fullHash.slice(4, 8)}...${fullHash.slice(-4)}`;
  }

  /**
   * Returns full 64-char hex SHA-256 digest of secret.
   */
  static computeFullFingerprintHex(rawSecret: string): string {
    return crypto.createHash('sha256').update(rawSecret).digest('hex');
  }

  /**
   * Computes HMAC-SHA-256 authentication verifier for database storage.
   */
  static computeAuthVerifier(rawSecret: string, serverPepper?: string): string {
    const pepper =
      serverPepper ||
      (typeof process !== 'undefined' ? process.env?.ORBITOX_SERVER_PEPPER : undefined) ||
      this.DEFAULT_PEPPER;

    return crypto.createHmac('sha256', pepper).update(rawSecret).digest('hex');
  }

  /**
   * Performs constant-time comparison to verify incoming raw secret against stored verifier.
   * Prevents timing attacks.
   */
  static verifySecret(incomingSecret: string, storedVerifier: string, serverPepper?: string): boolean {
    if (!incomingSecret || !storedVerifier) return false;

    try {
      const candidateVerifier = this.computeAuthVerifier(incomingSecret, serverPepper);
      const bufA = Buffer.from(candidateVerifier, 'hex');
      const bufB = Buffer.from(storedVerifier, 'hex');

      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }

  /**
   * Generates safe masked representation (e.g. `orb_live_••••••••0zE`)
   */
  static createMaskedDisplay(rawSecret: string): string {
    if (!rawSecret || rawSecret.length < 12) return 'orb_••••••••';
    const parts = rawSecret.split('_');
    const prefix = parts.length >= 2 ? `${parts[0]}_${parts[1]}_` : 'orb_';
    const suffix = rawSecret.slice(-4);
    return `${prefix}••••••••${suffix}`;
  }

  /**
   * Deterministically evaluates API key risk based on privilege, age, environment, and network posture.
   */
  static calculateRiskScore(input: KeyRiskInput): KeyRiskEvaluation {
    let score = 0;
    const factors: StructuredRiskFactor[] = [];

    // Factor 1: Production Access (+15)
    if (input.isProduction) {
      score += 15;
      factors.push({
        code: 'PRODUCTION_ACCESS',
        weight: 15,
        message: 'Key has live production environment execution authority.',
      });
    }

    // Factor 2: Broad Wildcard Capabilities (+35)
    const hasWildcard = input.capabilities?.some((c) => c === '*' || c.endsWith('.*'));
    if (hasWildcard) {
      score += 35;
      factors.push({
        code: 'WILDCARD_SCOPE',
        weight: 35,
        message: 'Key contains broad wildcard capabilities (* or package.*).',
      });
    }

    // Factor 3: Absence of Expiration (+20)
    if (!input.expiresAt) {
      score += 20;
      factors.push({
        code: 'NO_EXPIRATION',
        weight: 20,
        message: 'Key is non-expiring with indefinite lifetime.',
      });
    }

    // Factor 4: Stale / Inactive (>90 days unused) (+20)
    if (input.lastUsedAt) {
      const lastUsedMs = new Date(input.lastUsedAt).getTime();
      const daysSinceUse = (Date.now() - lastUsedMs) / (1000 * 3600 * 24);
      if (daysSinceUse > 90) {
        score += 20;
        factors.push({
          code: 'STALE_KEY',
          weight: 20,
          message: `Key has remained inactive for ${Math.floor(daysSinceUse)} days.`,
        });
      }
    } else if (input.issuedAt) {
      // Never used since creation (>60 days old)
      const issuedMs = new Date(input.issuedAt).getTime();
      const daysOld = (Date.now() - issuedMs) / (1000 * 3600 * 24);
      if (daysOld > 60) {
        score += 15;
        factors.push({
          code: 'NEVER_USED_DORMANT',
          weight: 15,
          message: `Key issued ${Math.floor(daysOld)} days ago was never exercised.`,
        });
      }
    }

    // Factor 5: Unconstrained Network CIDR (+10)
    if (!input.ipAllowlist || input.ipAllowlist.length === 0) {
      score += 10;
      factors.push({
        code: 'UNCONSTRAINED_CIDR',
        weight: 10,
        message: 'Key is not restricted by an IP allowlist (usable from any public IP).',
      });
    }

    // Factor 6: Excessive Age Without Rotation (>180 days) (+15)
    if (input.issuedAt) {
      const issuedMs = new Date(input.issuedAt).getTime();
      const ageDays = (Date.now() - issuedMs) / (1000 * 3600 * 24);
      if (ageDays > 180) {
        score += 15;
        factors.push({
          code: 'EXCESSIVE_AGE',
          weight: 15,
          message: `Key is ${Math.floor(ageDays)} days old and overdue for rotation.`,
        });
      }
    }

    score = Math.min(100, Math.max(0, score));

    let level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
    if (score >= 80) level = 'CRITICAL';
    else if (score >= 60) level = 'HIGH';
    else if (score >= 35) level = 'MEDIUM';

    return {
      score,
      level,
      factors,
    };
  }
}
