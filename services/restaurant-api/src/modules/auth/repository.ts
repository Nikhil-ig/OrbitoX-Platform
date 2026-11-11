import type { RestaurantRepository } from '../../../packages/storage';
import {
  getPublicStaffList,
  revokeStaffToken,
  isStaffTokenRevoked,
  resetStaffLockout,
} from '../../../packages/domain';

export class AuthRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getStaffMemberByIdentifier(identifier: string) {
    return this.repo.getStaffMemberByIdentifier(identifier);
  }

  async getStaffMember(id: string) {
    return this.repo.getStaffMember(id);
  }

  getPublicStaffList(branchId?: string) {
    return getPublicStaffList(branchId);
  }

  async getStaffMembers() {
    return this.repo.getStaffMembers();
  }

  async saveStaffMember(data: any) {
    return this.repo.saveStaffMember(data);
  }

  async revokeToken(token: string) {
    return revokeStaffToken(token);
  }

  isTokenRevoked(token: string) {
    return isStaffTokenRevoked(token);
  }

  resetLockout(tenantId: string) {
    return resetStaffLockout(tenantId);
  }
}
