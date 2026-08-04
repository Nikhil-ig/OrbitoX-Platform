import { Injectable, BadRequestException } from '@nestjs/common';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';

export interface TotpConfig {
  secret: string;
  uri: string;
}

@Injectable()
export class MfaService {
  constructor() {
    authenticator.options = { window: 1 }; // Allow 1 step before/after for clock drift
  }

  /**
   * Generates a new TOTP secret for a user
   */
  generateTotpSecret(email: string, appName: string = 'OrbitoX'): TotpConfig {
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(email, appName, secret);
    return { secret, uri };
  }

  /**
   * Verifies a TOTP token against a secret
   */
  verifyTotp(token: string, secret: string): boolean {
    try {
      return authenticator.check(token, secret);
    } catch (err) {
      return false;
    }
  }

  /**
   * Generates a set of single-use backup codes
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // 8-character alphanumeric code, hyphenated in middle
      const code = uuidv4().substring(0, 8).toUpperCase();
      codes.push(`${code.substring(0, 4)}-${code.substring(4, 8)}`);
    }
    return codes;
  }
}
