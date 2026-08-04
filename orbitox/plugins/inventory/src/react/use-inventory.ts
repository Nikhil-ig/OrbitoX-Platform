import { useState, useCallback } from 'react';
import { InventoryItem, CreateInventoryItemPayload, StockAdjustmentPayload, InventoryFilter } from '../domain/types';
import { HeadlessInventoryService } from '../domain/inventory-actions';

const defaultInventoryService = new HeadlessInventoryService([
  {
    id: 'inv-1',
    sku: 'LAP-MAC-16',
    name: 'MacBook Pro 16-inch',
    category: 'Electronics',
    quantity: 25,
    minReorderLevel: 5,
    unitPrice: 2499,
    status: 'IN_STOCK',
    warehouseLocation: 'Aisle 3, Shelf B',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'inv-2',
    sku: 'MON-DELL-27',
    name: 'Dell UltraSharp 27 Monitor',
    category: 'Electronics',
    quantity: 3,
    minReorderLevel: 10,
    unitPrice: 499,
    status: 'LOW_STOCK',
    warehouseLocation: 'Aisle 1, Shelf D',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
]);

export function useInventory(filter: InventoryFilter = {}) {
  const [service] = useState(() => defaultInventoryService);
  const [items, setItems] = useState<InventoryItem[]>(() => service.filterItems(filter));

  const refreshItems = useCallback(() => {
    setItems(service.filterItems(filter));
  }, [service, filter]);

  return {
    items,
    refreshItems
  };
}

export function useInventoryActions() {
  const [service] = useState(() => defaultInventoryService);

  const createItem = useCallback((payload: CreateInventoryItemPayload): InventoryItem => {
    return service.createItem(payload);
  }, [service]);

  const adjustStock = useCallback((adjustment: StockAdjustmentPayload): InventoryItem => {
    return service.adjustStock(adjustment);
  }, [service]);

  return {
    createItem,
    adjustStock
  };
}
