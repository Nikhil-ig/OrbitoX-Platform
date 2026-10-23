import * as crypto from 'crypto';
import { InventoryItem, CreateInventoryItemPayload, StockAdjustmentPayload, InventoryFilter } from './types';
import { InventoryStateMachine } from './inventory-state-machine';

export class HeadlessInventoryService {
  private items: InventoryItem[] = [];

  constructor(initialItems: InventoryItem[] = []) {
    this.items = [...initialItems];
  }

  createItem(payload: CreateInventoryItemPayload): InventoryItem {
    if (!payload.sku || payload.sku.trim() === '') {
      throw new Error('Inventory Validation Failed: SKU is required.');
    }
    if (!payload.name || payload.name.trim() === '') {
      throw new Error('Inventory Validation Failed: Name is required.');
    }

    const status = InventoryStateMachine.deriveStockStatus(payload.quantity, payload.minReorderLevel);

    const newItem: InventoryItem = {
      id: `inv_${crypto.randomUUID()}`,
      sku: payload.sku.trim().toUpperCase(),
      name: payload.name.trim(),
      category: payload.category.trim(),
      quantity: payload.quantity,
      minReorderLevel: payload.minReorderLevel,
      unitPrice: payload.unitPrice,
      status,
      warehouseLocation: payload.warehouseLocation?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.items.unshift(newItem);
    return newItem;
  }

  adjustStock(adjustment: StockAdjustmentPayload): InventoryItem {
    const item = this.items.find((i) => i.id === adjustment.itemId);
    if (!item) {
      throw new Error(`Inventory Item Not Found: ${adjustment.itemId}`);
    }

    if (!InventoryStateMachine.canAdjustStock(item.status)) {
      throw new Error(`Cannot adjust stock for discontinued item: ${item.sku}`);
    }

    const newQuantity = Math.max(0, item.quantity + adjustment.adjustmentAmount);
    const newStatus = InventoryStateMachine.deriveStockStatus(newQuantity, item.minReorderLevel);

    const updatedItem: InventoryItem = {
      ...item,
      quantity: newQuantity,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    const index = this.items.findIndex((i) => i.id === adjustment.itemId);
    if (index !== -1) {
      this.items[index] = updatedItem;
    }

    return updatedItem;
  }

  filterItems(filter: InventoryFilter = {}): InventoryItem[] {
    return this.items.filter((item) => {
      if (filter.category && item.category !== filter.category) return false;
      if (filter.status && item.status !== filter.status) return false;
      if (filter.needsReorder && item.quantity > item.minReorderLevel) return false;
      if (filter.search) {
        const query = filter.search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        if (!matchesName && !matchesSku) return false;
      }
      return true;
    });
  }

  forecastStockDemand(itemId: string, days: number = 30): { forecastedDemand: number; reorderRecommended: boolean } {
    const item = this.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`Inventory Item Not Found: ${itemId}`);

    const dailyBurnRate = Math.ceil(item.quantity * 0.05) || 1;
    const forecastedDemand = dailyBurnRate * days;
    const reorderRecommended = item.quantity - forecastedDemand <= item.minReorderLevel;

    return {
      forecastedDemand,
      reorderRecommended
    };
  }
}
