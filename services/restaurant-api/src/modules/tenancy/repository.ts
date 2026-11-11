import type { RestaurantRepository } from '../../../packages/storage';
import { postgresStore } from '../../shared/state';

export class TenancyRepository {
  constructor(private repo: RestaurantRepository) {}

  async getTenant(tenantId: string) {
    if (postgresStore?.prisma) {
      return postgresStore.prisma.tenant.findUnique({ where: { id: tenantId } });
    }
    return null;
  }

  async getDomains(tenantId: string) {
    if (postgresStore?.prisma) {
      return postgresStore.prisma.tenantDomain.findMany({ where: { tenantId } });
    }
    return [];
  }
}
