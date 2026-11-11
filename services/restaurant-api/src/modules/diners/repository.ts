import type { RestaurantRepository } from '../../../packages/storage';

export class DinersRepository {
  constructor(public readonly repo: RestaurantRepository) {}
}
