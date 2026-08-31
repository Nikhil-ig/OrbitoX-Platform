import * as crypto from 'crypto';
import { CryptoSigner } from './crypto-signer';
import { IntegrityVerifier } from './integrity-verifier';

export interface LicensePayload {
  licenseId: string;
  issuedTo: string;
  allowedDomain?: string;
  allowedTenants?: number;
  features?: string[];
  issuedAt: string;
  expiresAt?: string;
  tier?: 'starter' | 'growth' | 'enterprise';
}

export interface SignedLicenseToken {
  payload: LicensePayload;
  signature: string;
}

export interface LicenseValidationOptions {
  currentDomain?: string;
  activeTenantsCount?: number;
  requiredFeature?: string;
}

export interface LicenseValidationResult {
  valid: boolean;
  license?: LicensePayload;
  errors: string[];
}

export class LicenseEnforcer {
  /**
   * Generates a signed license token (base64 encoded JSON string) using RSA/Ed25519 private key.
   */
  static issueLicenseToken(payload: LicensePayload, privateKeyPem: string): string {
    const signature = CryptoSigner.signPayload(payload, privateKeyPem);
    const tokenData: SignedLicenseToken = {
      payload,
      signature,
    };
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  /**
   * Parses and cryptographically verifies a signed license token against the public key.
   */
  static verifyLicenseToken(
    tokenBase64: string,
    publicKeyPem: string,
    options?: LicenseValidationOptions
  ): LicenseValidationResult {
    const errors: string[] = [];

    let parsed: SignedLicenseToken;
    try {
      const decoded = Buffer.from(tokenBase64, 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch {
      return {
        valid: false,
        errors: ['Invalid license token format (corrupted or unparseable base64)'],
      };
    }

    const { payload, signature } = parsed;
    if (!payload || !signature) {
      return {
        valid: false,
        errors: ['License token missing required payload or cryptographic signature'],
      };
    }

    // 1. Verify digital signature
    const isValidSignature = IntegrityVerifier.verifyPayloadSignature(
      payload,
      signature,
      publicKeyPem
    );

    if (!isValidSignature) {
      errors.push('Tamper alert: License cryptographic signature is invalid or forged');
    }

    // 2. Check Expiration
    if (payload.expiresAt) {
      const expiry = new Date(payload.expiresAt).getTime();
      const now = Date.now();
      if (now > expiry) {
        errors.push(`License expired on ${payload.expiresAt}`);
      }
    }

    // 3. Domain / Host Binding Lock Check
    if (options?.currentDomain && payload.allowedDomain) {
      const allowed = payload.allowedDomain.toLowerCase().trim();
      const current = options.currentDomain.toLowerCase().trim();
      if (allowed !== '*' && allowed !== current && !current.endsWith('.' + allowed)) {
        errors.push(
          `Domain lock violation: License is only valid for "${payload.allowedDomain}", current domain is "${options.currentDomain}"`
        );
      }
    }

    // 4. Tenant Quota Limit Check
    if (
      typeof options?.activeTenantsCount === 'number' &&
      typeof payload.allowedTenants === 'number' &&
      options.activeTenantsCount > payload.allowedTenants
    ) {
      errors.push(
        `Tenant quota exceeded: License permits maximum ${payload.allowedTenants} tenants (current: ${options.activeTenantsCount})`
      );
    }

    // 5. Feature Entitlement Check
    if (options?.requiredFeature && payload.features) {
      if (!payload.features.includes('*') && !payload.features.includes(options.requiredFeature)) {
        errors.push(
          `Feature not entitled: License does not grant access to feature "${options.requiredFeature}"`
        );
      }
    }

    return {
      valid: errors.length === 0,
      license: payload,
      errors,
    };
  }
}
