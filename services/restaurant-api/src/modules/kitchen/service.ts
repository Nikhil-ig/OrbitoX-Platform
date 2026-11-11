import type { KitchenRepository } from './repository';

export class KitchenService {
  constructor(private repo: KitchenRepository) {}

  filterTasksByStation(tasks: any[], station?: string) {
    if (!station || station === 'ALL') return tasks;
    return tasks.filter((t) => t.station === station);
  }
}
