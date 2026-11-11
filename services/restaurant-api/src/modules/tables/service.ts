import type { TablesRepository } from './repository';
import { generateSeats } from '../../../packages/domain/floor';

export class TablesService {
  constructor(private repo: TablesRepository) {}

  generateTableSeats(capacity: number, tableId: number) {
    return generateSeats(capacity, tableId);
  }
}
