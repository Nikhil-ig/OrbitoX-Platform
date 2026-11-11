import type { RestaurantRepository } from '../../../packages/storage';

export class SupportRepository {
  constructor(public readonly repo: RestaurantRepository) {}
}
