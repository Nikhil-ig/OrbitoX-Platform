import {
  issueStaffToken,
  verifyStaffToken,
  checkStaffLockout,
  recordFailedStaffAttempt,
  recordSuccessfulStaffAttempt,
  hashStaffSecretSync,
  verifyStaffSecret,
  resolveClientIp,
  issueDeviceToken,
  verifyDeviceToken,
} from '../../../packages/domain';
import { AuthRepository } from './repository';

export class AuthService {
  constructor(private repo: AuthRepository) {}

  checkLockout(tenantId: string, identifier: string, clientIp: string) {
    return checkStaffLockout(tenantId, identifier, clientIp);
  }

  recordFailedAttempt(tenantId: string, identifier: string, clientIp: string) {
    return recordFailedStaffAttempt(tenantId, identifier, clientIp);
  }

  recordSuccessfulAttempt(tenantId: string, identifier: string, clientIp: string) {
    return recordSuccessfulStaffAttempt(tenantId, identifier, clientIp);
  }

  issueToken(payload: any) {
    return issueStaffToken(payload);
  }

  verifySecret(provided: string, salt: string, storedHash: string) {
    return verifyStaffSecret(provided, salt, storedHash);
  }

  hashSecret(secret: string, salt: string) {
    return hashStaffSecretSync(secret, salt);
  }

  issueDevice(payload: any) {
    return issueDeviceToken(payload);
  }
}
