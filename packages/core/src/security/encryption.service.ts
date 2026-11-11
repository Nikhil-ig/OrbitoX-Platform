import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { SecretsService } from './secrets.service';

/**
 * Handles AES-256-GCM column-level encryption for sensitive data.
 */
@Injectable()
export class EncryptionService {
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly IV_LENGTH = 16;
  private readonly AUTH_TAG_LENGTH = 16;
  
  constructor(private readonly secrets: SecretsService) {}

  private async getKey(): Promise<Buffer> {
    const keyString = await this.secrets.get('ENCRYPTION_KEY');
    const key = Buffer.from(keyString, 'base64');
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 bytes when base64 decoded');
    }
    return key;
  }

  /**
   * Encrypts plaintext and returns base64 string containing iv, auth tag, and ciphertext
   */
  async encrypt(plaintext: string): Promise<string> {
    const key = await this.getKey();
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    // Format: base64(iv:authTag:encryptedText)
    const payload = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    return Buffer.from(payload).toString('base64');
  }

  /**
   * Decrypts previously encrypted ciphertext
   */
  async decrypt(encryptedPayloadBase64: string): Promise<string> {
    const key = await this.getKey();
    const payload = Buffer.from(encryptedPayloadBase64, 'base64').toString('utf8');
    const [ivHex, authTagHex, encryptedText] = payload.split(':');

    if (!ivHex || !authTagHex || !encryptedText) {
      throw new Error('Invalid encryption payload format');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
