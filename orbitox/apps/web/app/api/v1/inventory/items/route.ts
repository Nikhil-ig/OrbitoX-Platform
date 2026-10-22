import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';

const INVENTORY_ITEMS = [
  {
    sku: 'SKU-MED-8821',
    name: 'Broad-Spectrum IV Antibiotic (Piperacillin 4.5g)',
    category: 'Pharmaceuticals',
    warehouse: 'Apex Central Cold Storage',
    binLocation: 'Aisle 3, Shelf B2',
    stockOnHand: 450,
    reservedStock: 35,
    reorderLevel: 100,
    unitCost: 28.5,
    lastAuditDate: '2026-09-01',
    status: 'optimal',
  },
  {
    sku: 'SKU-KIT-1092',
    name: 'Organic San Marzano DOP Tomatoes (Case of 12)',
    category: 'Restaurant Raw Materials',
    warehouse: 'OmniHub Fresh Depot North',
    binLocation: 'Cold Vault 4',
    stockOnHand: 180,
    reservedStock: 42,
    reorderLevel: 50,
    unitCost: 45.0,
    lastAuditDate: '2026-09-08',
    status: 'optimal',
  },
  {
    sku: 'SKU-LUX-4410',
    name: 'Cashmere Ribbed Knit Cardigan (Black / M)',
    category: 'Luxury Apparel',
    warehouse: 'Milan Global Fulfillment Center',
    binLocation: 'Vault Section 1',
    stockOnHand: 24,
    reservedStock: 6,
    reorderLevel: 10,
    unitCost: 480.0,
    lastAuditDate: '2026-09-05',
    status: 'optimal',
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'inventory',
    serviceName: 'Inventory & Logistics Engine',
  },
  async (req: NextRequest) => {
    return NextResponse.json({
      success: true,
      data: INVENTORY_ITEMS,
      meta: {
        totalSkus: INVENTORY_ITEMS.length,
        stockValuationUsd: 26820.0,
        warehouseCount: 3,
      },
    });
  }
);
