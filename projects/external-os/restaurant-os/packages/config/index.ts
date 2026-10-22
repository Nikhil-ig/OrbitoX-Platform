/**
 * 🪐 RestaurantOS Runtime Configuration Contract
 */

export interface RestaurantRuntimeConfig {
  port: number;
  controlPlaneUrl: string;
  projectId: string;
  brandName: string;
  taxBasisPoints: number; // e.g. 500 = 5% GST
  currency: string;
  defaultStationRouting: Record<string, string>;
}

export const defaultRuntimeConfig: RestaurantRuntimeConfig = {
  port: 4010,
  controlPlaneUrl: 'http://localhost:3005',
  projectId: 'project_restaurant_os',
  brandName: 'OrbitoX Bistro',
  taxBasisPoints: 500,
  currency: 'INR',
  defaultStationRouting: {
    Starters: 'TANDOOR',
    Mains: 'CURRY_LINE',
    Breads: 'TANDOOR',
    Beverages: 'BAR',
    Desserts: 'DESSERT',
  },
};
