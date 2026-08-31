import { Address } from './order.types';

export interface Customer {
  id: string;
  storeId: string;
  tenantId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  addresses: Address[];
  tags: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
