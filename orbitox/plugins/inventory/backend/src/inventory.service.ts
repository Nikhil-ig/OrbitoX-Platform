import { Injectable, Logger } from '@nestjs/common';

export interface ProductItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  getProducts(contextId: string): ProductItem[] {
    this.logger.log(`Fetching inventory products for context ${contextId}`);
    return [
      { id: 'prod-1', sku: 'SKU-1001', name: 'Industrial Router X1', quantity: 45, warehouse: 'Main Hub' },
      { id: 'prod-2', sku: 'SKU-1002', name: 'Fiber Cable 50m', quantity: 120, warehouse: 'East Wing' },
    ];
  }
}
