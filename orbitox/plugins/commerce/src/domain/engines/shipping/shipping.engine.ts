import { ShippingZone, ShippingRate } from '../../types/shipping.types';

export class ShippingEngine {
  private zones: Map<string, ShippingZone> = new Map();

  getDefaultShippingRates(storeId: string): ShippingRate[] {
    return [
      {
        id: 'ship_standard',
        name: 'Standard Insured Delivery',
        description: 'Estimated arrival in 3-5 business days',
        price: 15,
        freeAboveTotal: 100,
        estimatedDeliveryDays: '3-5 Days',
        enabled: true,
      },
      {
        id: 'ship_express',
        name: 'Priority White-Glove Express',
        description: 'Guaranteed arrival in 1-2 business days with real-time tracking',
        price: 35,
        estimatedDeliveryDays: '1-2 Days',
        enabled: true,
      },
    ];
  }

  calculateShipping(storeId: string, subtotal: number, shippingMethodId?: string): { selectedRate: ShippingRate; amount: number } {
    const rates = this.getDefaultShippingRates(storeId);
    const selected = rates.find((r) => r.id === shippingMethodId) || rates[0]!;

    let amount = selected.price;
    if (selected.freeAboveTotal && subtotal >= selected.freeAboveTotal) {
      amount = 0;
    }

    return { selectedRate: selected, amount };
  }
}
