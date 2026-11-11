import { postgresStore, store } from '../../shared/state';

export class ProvisioningRepository {
  async getTenant(tenantId: string) {
    if (postgresStore) return postgresStore.getTenant(tenantId);
    return null;
  }
}
