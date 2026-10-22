import * as crypto from 'crypto';
import { CredentialVault } from './credential-vault';

describe('CredentialVault (Two-Tier AES-256-GCM Envelope Encryption)', () => {
  const MASTER_KEK_A = crypto.randomBytes(32);
  const MASTER_KEK_B = crypto.randomBytes(32);

  describe('Envelope Encryption & Decryption', () => {
    it('should encrypt and decrypt external secret accurately', () => {
      const plaintextSecret = 'sk_test_51M0872abcdefghijklmnopqrstuvwxyz123456';
      
      const envelope = CredentialVault.encryptSecret(plaintextSecret, {
        kekId: 'kms:us-east-1:test-kek-v1',
        masterKek: MASTER_KEK_A,
      });

      expect(envelope.version).toBe(1);
      expect(envelope.kekIdentifier).toBe('kms:us-east-1:test-kek-v1');
      expect(envelope.encryptedDek).toBeDefined();
      expect(envelope.encryptedCiphertext).toBeDefined();
      expect(envelope.authenticationTag).toBeDefined();
      expect(envelope.secretFingerprint.startsWith('SHA256: ')).toBe(true);

      // Decrypt
      const decrypted = CredentialVault.decryptSecret(envelope, MASTER_KEK_A);
      expect(decrypted).toBe(plaintextSecret);
    });

    it('should fail closed when ciphertext is tampered (GCM auth tag verification)', () => {
      const plaintextSecret = 'super_sensitive_api_secret_token_9988';
      const envelope = CredentialVault.encryptSecret(plaintextSecret, { masterKek: MASTER_KEK_A });

      // Tamper ciphertext
      const rawCipher = Buffer.from(envelope.encryptedCiphertext, 'base64');
      rawCipher[0] = rawCipher[0]! ^ 0xff; // Flip bits
      envelope.encryptedCiphertext = rawCipher.toString('base64');

      expect(() => {
        CredentialVault.decryptSecret(envelope, MASTER_KEK_A);
      }).toThrow(/Tamper Alert/);
    });

    it('should fail closed when authentication tag is tampered', () => {
      const plaintextSecret = 'another_sensitive_secret_value';
      const envelope = CredentialVault.encryptSecret(plaintextSecret, { masterKek: MASTER_KEK_A });

      // Corrupt auth tag
      const rawTag = Buffer.from(envelope.authenticationTag, 'base64');
      rawTag[0] = rawTag[0]! ^ 0xff;
      envelope.authenticationTag = rawTag.toString('base64');

      expect(() => {
        CredentialVault.decryptSecret(envelope, MASTER_KEK_A);
      }).toThrow(/Tamper Alert/);
    });
  });

  describe('Zero-Downtime Master Key Rotation (Re-encryption)', () => {
    it('should rotate Master KEK without touching ciphertext payload', () => {
      const secret = 'aws_secret_access_key_wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

      // 1. Initial encryption with KEK A
      const envelopeA = CredentialVault.encryptSecret(secret, {
        kekId: 'kms:kek-v1',
        masterKek: MASTER_KEK_A,
      });

      expect(CredentialVault.decryptSecret(envelopeA, MASTER_KEK_A)).toBe(secret);

      // 2. Rotate to KEK B
      const envelopeB = CredentialVault.reencryptEnvelope(
        envelopeA,
        MASTER_KEK_A,
        MASTER_KEK_B,
        'kms:kek-v2'
      );

      expect(envelopeB.kekIdentifier).toBe('kms:kek-v2');
      // Payload ciphertext remains unchanged
      expect(envelopeB.encryptedCiphertext).toBe(envelopeA.encryptedCiphertext);

      // 3. Decrypt with KEK B succeeds
      expect(CredentialVault.decryptSecret(envelopeB, MASTER_KEK_B)).toBe(secret);

      // 4. Decrypt with old KEK A fails
      expect(() => {
        CredentialVault.decryptSecret(envelopeB, MASTER_KEK_A);
      }).toThrow(/Tamper Alert/);
    });
  });

  describe('Display Masking & Fingerprints', () => {
    it('should mask various secret provider prefixes safely', () => {
      expect(CredentialVault.maskSecret('sk_live_1234567890abcdef')).toBe('sk_live_••••••••cdef');
      expect(CredentialVault.maskSecret('AKIAIOSFODNN7EXAMPLE')).toBe('AKIA••••••••MPLE');
      expect(CredentialVault.maskSecret('ghp_abcdefghijklmnopqrstuvwxyz123456')).toBe('ghp_••••••••3456');
    });

    it('should compute consistent SHA-256 fingerprints', () => {
      const secret = 'stripe_sk_test_secret';
      const fp1 = CredentialVault.computeFingerprint(secret);
      const fp2 = CredentialVault.computeFingerprint(secret);
      expect(fp1).toBe(fp2);
      expect(fp1.startsWith('SHA256: ')).toBe(true);
    });
  });
});
