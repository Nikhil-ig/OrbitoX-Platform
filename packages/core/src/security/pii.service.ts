import { Injectable } from '@nestjs/common';

/**
 * Service for handling PII (Personally Identifiable Information) masking.
 * Used for logging and displaying data safely (Rule A4).
 */
@Injectable()
export class PiiService {
  
  /**
   * Masks an email address (e.g. john.doe@example.com -> j***e@example.com)
   */
  maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***';
    
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***@***.***';

    const maskedLocal = local.length > 2 
      ? `${local[0]}***${local[local.length - 1]}`
      : `*${local.substring(1)}`;
      
    return `${maskedLocal}@${domain}`;
  }

  /**
   * Masks a phone number (e.g. +1234567890 -> +1******7890)
   */
  maskPhone(phone: string): string {
    if (!phone) return '***';
    // Keep first 2 and last 4 characters, mask the rest
    const stripped = phone.replace(/[^0-9+]/g, '');
    if (stripped.length <= 6) return '***';
    
    return stripped.substring(0, 2) + '*'.repeat(stripped.length - 6) + stripped.substring(stripped.length - 4);
  }

  /**
   * Masks a credit card number (e.g. 4111222233334444 -> **** **** **** 4444)
   */
  maskCreditCard(cc: string): string {
    if (!cc) return '****';
    const stripped = cc.replace(/[^0-9]/g, '');
    if (stripped.length < 4) return '****';
    
    return '*'.repeat(stripped.length - 4) + stripped.substring(stripped.length - 4);
  }

  /**
   * Deeply sanitizes an object by masking PII fields.
   */
  sanitize(data: any): any {
    if (!data) return data;
    if (typeof data !== 'object') return data;
    if (Array.isArray(data)) return data.map(item => this.sanitize(item));

    const result = { ...data };
    for (const key of Object.keys(result)) {
      if (typeof result[key] === 'object' && result[key] !== null) {
        result[key] = this.sanitize(result[key]);
      } else if (typeof result[key] === 'string') {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('email')) {
          result[key] = this.maskEmail(result[key]);
        } else if (lowerKey.includes('phone')) {
          result[key] = this.maskPhone(result[key]);
        } else if (lowerKey.includes('card') || lowerKey.includes('cc')) {
          result[key] = this.maskCreditCard(result[key]);
        } else if (lowerKey.includes('password') || lowerKey.includes('secret') || lowerKey.includes('token')) {
          result[key] = '***REDACTED***';
        }
      }
    }
    return result;
  }
}
