import { NextRequest } from 'next/server';
import { restaurantRuntime } from '../_lib/restaurant-runtime';
import { createLegacyProxyResponse } from '../_lib/legacy-proxy';

/**
 * ⚠️ LEGACY COMPATIBILITY PROXY: Pricing Quote
 * Target runtime: http://localhost:4010/api/restaurant/quote
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, companyId, locationId, sessionId, cartItems } = body;

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return createLegacyProxyResponse(
        { success: false, error: 'cartItems array is required' },
        { status: 400 }
      );
    }

    const quote = restaurantRuntime.catalogService.requestQuote({
      tenantId: tenantId || 'tenant_orbitox',
      companyId: companyId || 'company_bistro',
      locationId: locationId || 'loc_ludhiana',
      sessionId: sessionId || 'sess_1001',
      cartItems,
      taxRateBasisPoints: 500, // 5% GST
      serviceFeeBasisPoints: 0,
    });

    // Serialize BigInts safely for JSON output
    const serialized = {
      ...quote,
      subtotalMinor: quote.subtotalMinor.toString(),
      taxMinor: quote.taxMinor.toString(),
      serviceFeeMinor: quote.serviceFeeMinor.toString(),
      discountMinor: quote.discountMinor.toString(),
      totalMinor: quote.totalMinor.toString(),
      breakdown: quote.breakdown.map(b => ({
        ...b,
        amountMinor: b.amountMinor.toString(),
      })),
    };

    return createLegacyProxyResponse({ success: true, data: serialized });
  } catch (error: any) {
    return createLegacyProxyResponse(
      { success: false, error: error.message || 'Quote calculation failed' },
      { status: 422 }
    );
  }
}
