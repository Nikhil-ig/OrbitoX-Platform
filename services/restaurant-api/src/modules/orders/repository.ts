import type { RestaurantRepository } from '../../../packages/storage';
import type { RestaurantOrder } from '../../../packages/domain';

export class OrdersRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getOrders(branchId?: string) { return this.repo.getOrders(undefined, undefined, branchId); }
  async getOrder(id: string) { return this.repo.getOrder(id); }
  async addOrder(order: RestaurantOrder) { return this.repo.addOrder(order); }
  async cancelOrder(id: string, reason?: string) { return this.repo.cancelOrder(id, reason); }
}
