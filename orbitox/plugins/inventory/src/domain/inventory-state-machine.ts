import { StockStatus } from './types';

export class InventoryStateMachine {
  static deriveStockStatus(quantity: number, minReorderLevel: number, isDiscontinued: boolean = false): StockStatus {
    if (isDiscontinued) return 'DISCONTINUED';
    if (quantity <= 0) return 'OUT_OF_STOCK';
    if (quantity <= minReorderLevel) return 'LOW_STOCK';
    return 'IN_STOCK';
  }

  static canAdjustStock(currentStatus: StockStatus): boolean {
    return currentStatus !== 'DISCONTINUED';
  }
}
