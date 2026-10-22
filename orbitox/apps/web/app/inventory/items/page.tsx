'use client';

import React, { useState } from 'react';
import PlatformLayout from '../../(platform)/layout';
import { DynamicTable, ColumnDef, Card, Badge, Button } from '@orbitox/ui';
import { useAdmin } from '../../admin/data/admin-context';

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: string;
  status: string;
  warehouseLocation: string;
}

const columns: ColumnDef<InventoryRow>[] = [
  { key: 'sku', header: 'SKU' },
  { key: 'name', header: 'Product Name' },
  { key: 'category', header: 'Category' },
  { key: 'quantity', header: 'Stock Level' },
  { key: 'unitPrice', header: 'Unit Price' },
  {
    key: 'status',
    header: 'Status',
    render: (item: InventoryRow) => {
      const variant = item.status === 'IN_STOCK' ? 'success' : item.status === 'LOW_STOCK' ? 'warning' : 'danger';
      return <Badge variant={variant as any}>{item.status}</Badge>;
    },
  },
  { key: 'warehouseLocation', header: 'Warehouse Location' },
];

const mockItems: InventoryRow[] = [
  {
    id: 'inv-1',
    sku: 'LAP-MAC-16',
    name: 'MacBook Pro 16-inch',
    category: 'Electronics',
    quantity: 25,
    unitPrice: '$2,499.00',
    status: 'IN_STOCK',
    warehouseLocation: 'Aisle 3, Shelf B',
  },
  {
    id: 'inv-2',
    sku: 'MON-DELL-27',
    name: 'Dell UltraSharp 27 Monitor',
    category: 'Electronics',
    quantity: 3,
    unitPrice: '$499.00',
    status: 'LOW_STOCK',
    warehouseLocation: 'Aisle 1, Shelf D',
  },
  {
    id: 'inv-3',
    sku: 'CAB-ETH-100',
    name: 'Cat6 Ethernet Cable 100m',
    category: 'Networking',
    quantity: 0,
    unitPrice: '$49.00',
    status: 'OUT_OF_STOCK',
    warehouseLocation: 'Aisle 5, Shelf A',
  },
];

export default function InventoryItemsPage() {
  const [items, setItems] = useState<InventoryRow[]>(mockItems);
  const { isServiceActive, consumeQuota, recordTenantAction, showToast } = useAdmin();

  const handleAddProduct = () => {
    if (!isServiceActive('inventory')) {
      showToast('Action Denied: Inventory microservice is currently BLOCKED in Platform Admin.');
      return;
    }

    const quotaCheck = consumeQuota({ serviceId: 'inventory', actionName: 'PRODUCT_ADDED' });
    if (!quotaCheck.allowed) {
      showToast(`Action Blocked: ${quotaCheck.reason}`);
      return;
    }

    const newRow: InventoryRow = {
      id: `inv-${Date.now()}`,
      sku: `SRV-AI-${Math.floor(100 + Math.random() * 900)}`,
      name: 'NVIDIA H100 Tensor Core GPU Node',
      category: 'Server Hardware',
      quantity: 12,
      unitPrice: '$32,500.00',
      status: 'IN_STOCK',
      warehouseLocation: 'Bay 4, Rack C',
    };

    setItems((prev) => [newRow, ...prev]);

    recordTenantAction({
      serviceId: 'inventory',
      serviceName: 'Inventory & Stock Logistics',
      action: 'STOCK_RESTOCKED',
      details: 'Added NVIDIA H100 GPU Node (Qty: 12)',
      amount: '$390,000',
      type: 'receive',
    });

    showToast('Inventory SKU Added • Synced to Platform Admin');
  };

  return (
    <PlatformLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0' }}>Inventory & Stock Logistics</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
              Multi-warehouse stock levels, SKU tracking, reorder velocity & AI demand forecasting • Connected to Platform OS
            </p>
          </div>
          <Button variant="primary" onClick={handleAddProduct}>+ Add Product</Button>
        </div>

        <Card title="Warehouse Product Stock">
          <DynamicTable columns={columns} data={items} />
        </Card>
      </div>
    </PlatformLayout>
  );
}
