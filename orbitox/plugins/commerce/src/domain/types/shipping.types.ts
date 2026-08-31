export interface ShippingRate {
  id: string;
  name: string; // e.g. "Standard Delivery", "Express Express (1-2 Days)"
  description?: string;
  price: number;
  minOrderTotal?: number;
  freeAboveTotal?: number;
  estimatedDeliveryDays?: string; // e.g. "3-5 Business Days"
  enabled: boolean;
}

export interface ShippingZone {
  id: string;
  storeId: string;
  name: string; // e.g. "Domestic (All India)", "North America"
  countries: string[]; // e.g. ["IN", "US", "CA"]
  rates: ShippingRate[];
}
