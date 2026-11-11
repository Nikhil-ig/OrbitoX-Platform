import type { RestaurantRepository } from '../../../packages/storage';

export class OwnersRepository {
  constructor(public readonly repo: RestaurantRepository) {}
}
