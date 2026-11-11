import type { RestaurantRepository } from '../../../packages/storage';

export class MenuRepository {
  constructor(public readonly repo: RestaurantRepository) {}

  async getMenuItems() { return this.repo.getMenuItems(); }
}
