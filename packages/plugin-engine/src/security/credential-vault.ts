import * as crypto from 'crypto';

export interface EncryptedCredentialEnvelope {
  version: number;
  kekIdentifier: string;
  encryptedDek: string; // Base64 DEK encrypted with Master KEK
  dekIv: string; // Base64 IV used for DEK encryption
  dekTag: string; // Base64 AuthTag for DEK encryption
  initializationVector: string; // 96-bit Base64 IV used for payload encryption
  authenticationTag: string; // 128-bit Base64 GCM Auth Tag for payload
  encryptedCiphertext: string; // AES-256-GCM Encrypted Secret Payload (Base64)
  secretFingerprint: string; // SHA-256(plaintext).hex
}

export interface EncryptOptions {
  kekId?: string;
  masterKek?: Buffer;
}

export class CredentialVault {
  private static readonly CIPHER_ALGO = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96-bit IV recommended for GCM
  private static readonly DEK_LENGTH = 32; // 256-bit AES Key
  private static readonly DEFAULT_KEK_ID = 'kms:us-east-1:orbitox-master-kek-v1';

  // Fallback dev master KEK if none provided
  private static readonly FALLBACK_MASTER_KEK = crypto.createHash('sha256').update('orbitox-default-dev-master-kek-2026').digest();

  /**
   * Encrypts an external integration secret using Two-Tier Envelope Encryption.
   * Generates unique 256-bit DEK, encrypts payload, then encrypts DEK using Master KEK.
   */
  static encryptSecret(
    plaintext: string,
    options: EncryptOptions = {}
  ): EncryptedCredentialEnvelope {
    if (!plaintext) {
      throw new Error('CredentialVault: Plaintext secret cannot be empty.');
    }

    const masterKek = options.masterKek || this.FALLBACK_MASTER_KEK;
    const kekIdentifier = options.kekId || this.DEFAULT_KEK_ID;

    // 1. Generate unique DEK (Data Encryption Key)
    const dek = crypto.randomBytes(this.DEK_LENGTH);

    // 2. Generate unique 96-bit IV for Payload
    const payloadIv = crypto.randomBytes(this.IV_LENGTH);

    // 3. Encrypt Plaintext Payload with DEK via AES-256-GCM
    const cipher = crypto.createCipheriv(this.CIPHER_ALGO, dek, payloadIv);
    let ciphertextBuf = cipher.update(plaintext, 'utf8');
    ciphertextBuf = Buffer.concat([ciphertextBuf, cipher.final()]);
    const payloadAuthTag = cipher.getAuthTag();

    // 4. Encrypt DEK with Master KEK via AES-256-GCM
    const dekIv = crypto.randomBytes(this.IV_LENGTH);
    const dekCipher = crypto.createCipheriv(this.CIPHER_ALGO, masterKek, dekIv);
    let encryptedDekBuf = dekCipher.update(dek);
    encryptedDekBuf = Buffer.concat([encryptedDekBuf, dekCipher.final()]);
    const dekTag = dekCipher.getAuthTag();

    // 5. Compute human visual audit fingerprint
    const secretFingerprint = this.computeFingerprint(plaintext);

    return {
      version: 1,
      kekIdentifier,
      encryptedDek: encryptedDekBuf.toString('base64'),
      dekIv: dekIv.toString('base64'),
      dekTag: dekTag.toString('base64'),
      initializationVector: payloadIv.toString('base64'),
      authenticationTag: payloadAuthTag.toString('base64'),
      encryptedCiphertext: ciphertextBuf.toString('base64'),
      secretFingerprint,
    };
  }

  /**
   * Decrypts an external integration secret from its envelope.
   * Decrypts DEK using Master KEK, then decrypts payload with DEK.
   * Guarantees anti-tamper authenticity.
   */
  static decryptSecret(
    envelope: EncryptedCredentialEnvelope,
    masterKek?: Buffer
  ): string {
    if (!envelope || !envelope.encryptedCiphertext) {
      throw new Error('CredentialVault: Invalid or empty envelope.');
    }

    const kek = masterKek || this.FALLBACK_MASTER_KEK;

    // 1. Decrypt DEK using Master KEK
    let dek: Buffer;
    try {
      const encryptedDekBuf = Buffer.from(envelope.encryptedDek, 'base64');
      const dekIvBuf = Buffer.from(envelope.dekIv, 'base64');
      const dekTagBuf = Buffer.from(envelope.dekTag, 'base64');

      const dekDecipher = crypto.createDecipheriv(this.CIPHER_ALGO, kek, dekIvBuf);
      dekDecipher.setAuthTag(dekTagBuf);
      dek = Buffer.concat([dekDecipher.update(encryptedDekBuf), dekDecipher.final()]);
    } catch {
      throw new Error('CredentialVault Tamper Alert: Failed to decrypt DEK. Master KEK mismatch or key corrupted.');
    }

    // 2. Decrypt Payload using DEK
    try {
      const payloadIvBuf = Buffer.from(envelope.initializationVector, 'base64');
      const payloadTagBuf = Buffer.from(envelope.authenticationTag, 'base64');
      const ciphertextBuf = Buffer.from(envelope.encryptedCiphertext, 'base64');

      const decipher = crypto.createDecipheriv(this.CIPHER_ALGO, dek, payloadIvBuf);
      decipher.setAuthTag(payloadTagBuf);
      const decryptedBuf = Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);

      return decryptedBuf.toString('utf8');
    } catch {
      throw new Error('CredentialVault Tamper Alert: Ciphertext authentication failed. Secret data has been modified or corrupted.');
    }
  }

  /**
   * Re-encrypts the envelope's DEK with a new Master KEK without decrypting or exposing the payload.
   * Used for zero-downtime Master Key rotation.
   */
  static reencryptEnvelope(
    envelope: EncryptedCredentialEnvelope,
    oldMasterKek: Buffer,
    newMasterKek: Buffer,
    newKekId: string
  ): EncryptedCredentialEnvelope {
    // 1. Decrypt DEK with old KEK
    const encryptedDekBuf = Buffer.from(envelope.encryptedDek, 'base64');
    const dekIvBuf = Buffer.from(envelope.dekIv, 'base64');
    const dekTagBuf = Buffer.from(envelope.dekTag, 'base64');

    const dekDecipher = crypto.createDecipheriv(this.CIPHER_ALGO, oldMasterKek, dekIvBuf);
    dekDecipher.setAuthTag(dekTagBuf);
    const dek = Buffer.concat([dekDecipher.update(encryptedDekBuf), dekDecipher.final()]);

    // 2. Encrypt DEK with new KEK
    const newDekIv = crypto.randomBytes(this.IV_LENGTH);
    const newDekCipher = crypto.createCipheriv(this.CIPHER_ALGO, newMasterKek, newDekIv);
    const newEncryptedDekBuf = Buffer.concat([newDekCipher.update(dek), newDekCipher.final()]);
    const newDekTag = newDekCipher.getAuthTag();

    return {
      ...envelope,
      kekIdentifier: newKekId,
      encryptedDek: newEncryptedDekBuf.toString('base64'),
      dekIv: newDekIv.toString('base64'),
      dekTag: newDekTag.toString('base64'),
    };
  }

  /**
   * Computes display fingerprint for human identification.
   */
  static computeFingerprint(plaintext: string): string {
    const fullHash = crypto.createHash('sha256').update(plaintext).digest('hex').toUpperCase();
    return `SHA256: ${fullHash.slice(0, 4)}:${fullHash.slice(4, 8)}...${fullHash.slice(-4)}`;
  }

  /**
   * Safely masks external secret for display (e.g. `sk_live_••••••••9F2A`).
   */
  static maskSecret(plaintext: string): string {
    if (!plaintext || plaintext.length < 8) return '••••••••';
    const suffix = plaintext.slice(-4);
    
    // Check common prefixes
    if (plaintext.startsWith('sk_live_')) return `sk_live_••••••••${suffix}`;
    if (plaintext.startsWith('sk_test_')) return `sk_test_••••••••${suffix}`;
    if (plaintext.startsWith('AKIA')) return `AKIA••••••••${suffix}`;
    if (plaintext.startsWith('ghp_')) return `ghp_••••••••${suffix}`;

    return `••••••••${suffix}`;
  }
}
