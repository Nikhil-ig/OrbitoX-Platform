import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, PlatformApiState } from '../../_lib/api-guard';

// In-memory catalog store
let products = [
  {
    id: 'prod-01',
    name: 'Milano Silk Trench Coat',
    sku: 'AUR-TC-001',
    price: 1250,
    currency: 'USD',
    inventory: 24,
    status: 'active',
    category: 'Outerwear',
    imageUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=800',
    description: '100% fine Italian mulberry silk trench coat with horn buttons.',
  },
  {
    id: 'prod-02',
    name: 'Verona Cashmere Knit Cardigan',
    sku: 'AUR-CK-002',
    price: 890,
    currency: 'USD',
    inventory: 42,
    status: 'active',
    category: 'Knitwear',
    imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800',
    description: 'Double-ply Mongolian cashmere woven in Biella, Italy.',
  },
  {
    id: 'prod-03',
    name: 'Soleil 18K Solid Gold Choker',
    sku: 'AUR-JW-003',
    price: 3400,
    currency: 'USD',
    inventory: 8,
    status: 'active',
    category: 'Fine Jewellery',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=800',
    description: 'Handcrafted solid 18 karat yellow gold choker with brushed finish.',
  },
  {
    id: 'prod-04',
    name: 'Palazzo Suede Chelsea Boots',
    sku: 'AUR-BT-004',
    price: 680,
    currency: 'USD',
    inventory: 15,
    status: 'active',
    category: 'Footwear',
    imageUrl: 'https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=800',
    description: 'Blake-stitched Italian calf suede boots with memory foam insoles.',
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'commerce',
    serviceName: 'Commerce & Store Engine',
  },
  async (req: NextRequest, ctx) => {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();

    let list = products;
    if (category && category !== 'all') {
      list = list.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.sku.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      data: list,
      meta: {
        storeSlug: ctx.tenantId || 'aura-luxury',
        total: list.length,
        timestamp: new Date().toISOString(),
      },
    });
  }
);

export const POST = withApiGuard(
  {
    serviceId: 'commerce',
    serviceName: 'Commerce & Store Engine',
    requiredScopes: ['write', 'commerce.catalog.manage'],
  },
  async (req: NextRequest, ctx) => {
    try {
      const body = await req.json();
      if (!body.name || !body.price) {
        return NextResponse.json(
          { success: false, error: { code: 'INVALID_INPUT', message: 'Fields "name" and "price" are required.' } },
          { status: 400 }
        );
      }

      const newProduct = {
        id: `prod-${Date.now()}`,
        name: body.name,
        sku: body.sku || `AUR-${Math.floor(100 + Math.random() * 900)}`,
        price: Number(body.price),
        currency: body.currency || 'USD',
        inventory: Number(body.inventory) || 10,
        status: body.status || 'active',
        category: body.category || 'General',
        imageUrl: body.imageUrl || 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=800',
        description: body.description || '',
      };

      products = [newProduct, ...products];

      PlatformApiState.recordTelemetry({
        tenantId: ctx.tenantId,
        serviceId: 'commerce',
        facade: 'BillingFacade',
        level: 'INFO',
        message: `Catalog product added: [${newProduct.name}] ($${newProduct.price}) for tenant [${ctx.tenantId}].`,
      });

      return NextResponse.json({
        success: true,
        data: newProduct,
        message: `Product ${newProduct.name} created successfully.`,
      });
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: { code: 'BAD_REQUEST', message: err.message } },
        { status: 400 }
      );
    }
  }
);
