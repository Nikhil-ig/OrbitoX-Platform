export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minReorderLevel: number;
  unitPrice: number;
  status: StockStatus;
  warehouseLocation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInventoryItemPayload {
  sku: string;
  name: string;
  category: string;
  quantity: number;
  minReorderLevel: number;
  unitPrice: number;
  warehouseLocation?: string;
}

export interface StockAdjustmentPayload {
  itemId: string;
  adjustmentAmount: number;
  reason: 'PURCHASE' | 'SALE' | 'DAMAGE' | 'AUDIT_CORRECTION';
}

export interface InventoryFilter {
  category?: string;
  status?: StockStatus;
  search?: string;
  needsReorder?: boolean;
}
