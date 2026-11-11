import type { OrdersRepository } from './repository';

export class OrdersService {
  constructor(private repo: OrdersRepository) {}

  isValidStatusTransition(current: string, target: string): boolean {
    const valid: Record<string, string[]> = {
      RECEIVED: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['SERVED', 'CANCELLED'],
      SERVED: ['PAID'],
      PAID: [],
      CANCELLED: [],
    };
    return (valid[current] || []).includes(target);
  }
}
