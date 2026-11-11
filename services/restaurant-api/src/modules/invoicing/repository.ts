import type { RestaurantRepository } from '../../../packages/storage';
import { postgresStore } from '../../shared/state';

export class InvoicingRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getInvoices(tenantId: string) {
    if (postgresStore?.prisma) {
      return postgresStore.prisma.invoice.findMany({ where: { tenantId } });
    }
    return [];
  }
}
