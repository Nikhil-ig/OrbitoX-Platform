import { Injectable } from '@nestjs/common';

/**
 * Interface for secret management providers (Rule 5: Everything Replaceable)
 */
export interface SecretsProvider {
  get(key: string): Promise<string>;
  set(key: string, value: string): Promise<void>;
}

/**
 * Service for securely accessing secrets (API keys, DB credentials, etc.)
 * Fallbacks to process.env for local development.
 */
@Injectable()
export class SecretsService implements SecretsProvider {
  /**
   * Retrieves a secret by key.
   * Throws if the secret is not found (Fail closed).
   */
  async get(key: string): Promise<string> {
    // For MVP / Local dev, read from environment variables
    // In production, this would use AWS KMS or HashiCorp Vault
    
    // Convert 'billing/stripe/secret_key' format to 'STRIPE_SECRET_KEY'
    const envKey = key.split('/').pop()?.toUpperCase() || key;
    
    const value = process.env[envKey];
    if (!value) {
      throw new Error(`Secret not found for key: ${key}`);
    }
    
    return value;
  }

  async set(key: string, value: string): Promise<void> {
    throw new Error('Not implemented for EnvSecretsProvider');
  }
}
