import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';

const menuItems = [
  { id: 'item-01', name: 'Wood-Fired Truffle Margherita', category: 'Pizza', price: 28, preparationTimeMin: 12, available: true },
  { id: 'item-02', name: 'Wagyu Ribeye Steak (A5 8oz)', category: 'Mains', price: 95, preparationTimeMin: 20, available: true },
  { id: 'item-03', name: 'Wild Mushroom Risotto', category: 'Primi', price: 34, preparationTimeMin: 18, available: true },
  { id: 'item-04', name: 'Classic Tiramisu al Mascarpone', category: 'Dessert', price: 16, preparationTimeMin: 5, available: true },
  { id: 'item-05', name: 'Barolo DOCG 2018 Glass', category: 'Wine', price: 22, preparationTimeMin: 2, available: true },
];

export const GET = withApiGuard(
  {
    serviceId: 'restaurant',
    serviceName: 'Restaurant & Kitchen OS',
  },
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    let list = menuItems;
    if (category && category !== 'all') {
      list = list.filter((m) => m.category.toLowerCase() === category.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      data: list,
      meta: { total: list.length },
    });
  }
);
