import type { RestaurantRepository } from '../../../packages/storage';
import { postgresStore } from '../../shared/state';

export class PaymentsRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getPaymentConfig(tenantId: string) {
    if (postgresStore?.prisma) {
      return postgresStore.prisma.tenantPaymentConfig.findUnique({ where: { tenantId } });
    }
    return null;
  }
}
