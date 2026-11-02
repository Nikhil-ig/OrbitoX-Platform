/**
 * 🪐 OrbitoX SDK - RestaurantOS Typed Plugin Client
 */

import { HttpTransport } from '../transport';

export interface MenuItemRecord {
  id: string;
  name: string;
  price: number;
  category?: string;
  description?: string;
  isAvailable?: boolean;
  [key: string]: any;
}

export interface OrderItemInput {
  id: string;
  name?: string;
  price?: number;
  quantity: number;
  specialInstructions?: string;
}

export interface OrderCreateInput {
  tableNumber?: number | string;
  items: OrderItemInput[];
  customerName?: string;
  notes?: string;
  [key: string]: any;
}

export interface OrderRecord {
  id: string;
  tenantId: string;
  tableNumber?: number | string;
  items: OrderItemInput[];
  totalAmount?: number;
  status: string;
  createdAt: string;
  [key: string]: any;
}

export class RestaurantOsClient {
  constructor(
    private readonly transport: HttpTransport,
    readonly tenantId: string,
    private readonly targetBaseUrl?: string,
    private readonly customHeaders: Record<string, string> = {}
  ) {}

  private get headers(): Record<string, string> {
    let slug = this.tenantId;
    if (slug.includes('/project/')) {
      slug = slug.split('/project/')[1]?.split('/')[0] || slug;
    } else if (slug.includes('.')) {
      slug = slug.split('.')[0] || slug;
    }

    return {
      Host: `${slug}.localhost`,
      'x-tenant-id': slug,
      'x-tenant-slug': slug,
      ...this.customHeaders,
    };
  }

  private resolvePath(endpoint: string): string {
    if (this.targetBaseUrl) {
      const base = this.targetBaseUrl.replace(/\/+$/, '');
      const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      return `${base}${path}`;
    }
    return endpoint;
  }

  readonly menu = {
    get: async (): Promise<MenuItemRecord[]> => {
      const res = await this.transport.request<{ success?: boolean; data?: MenuItemRecord[]; items?: MenuItemRecord[] }>({
        method: 'GET',
        path: this.resolvePath('/api/restaurant/menu'),
        headers: this.headers,
      });
      return (res.data || res.items || (Array.isArray(res) ? res : [])) as MenuItemRecord[];
    },
  };

  readonly orders = {
    list: async (): Promise<OrderRecord[]> => {
      const res = await this.transport.request<{ success?: boolean; data?: OrderRecord[]; orders?: OrderRecord[] }>({
        method: 'GET',
        path: this.resolvePath('/api/restaurant/orders'),
        headers: this.headers,
      });
      return (res.data || res.orders || (Array.isArray(res) ? res : [])) as OrderRecord[];
    },

    create: async (
      input: OrderCreateInput,
      options: { idempotencyKey?: string } = {}
    ): Promise<OrderRecord> => {
      const res = await this.transport.request<{ success?: boolean; data?: OrderRecord; order?: OrderRecord }>({
        method: 'POST',
        path: this.resolvePath('/api/restaurant/orders'),
        body: input,
        headers: this.headers,
        idempotencyKey: options.idempotencyKey,
      });
      return (res.data || res.order || res) as OrderRecord;
    },
  };

  readonly sessions = {
    join: async (
      input: { tableNumber: number | string; guestName?: string },
      options: { idempotencyKey?: string } = {}
    ): Promise<any> => {
      return this.transport.request({
        method: 'POST',
        path: this.resolvePath('/api/restaurant/sessions/join'),
        body: input,
        headers: this.headers,
        idempotencyKey: options.idempotencyKey,
      });
    },
  };

  readonly kds = {
    getTasks: async (): Promise<any[]> => {
      const res = await this.transport.request<{ success?: boolean; data?: any[]; tasks?: any[] }>({
        method: 'GET',
        path: this.resolvePath('/api/restaurant/kds'),
        headers: this.headers,
      });
      return (res.data || res.tasks || (Array.isArray(res) ? res : [])) as any[];
    },
  };

  readonly quote = {
    create: async (input: any, options: { idempotencyKey?: string } = {}): Promise<any> => {
      return this.transport.request({
        method: 'POST',
        path: this.resolvePath('/api/restaurant/quote'),
        body: input,
        headers: this.headers,
        idempotencyKey: options.idempotencyKey,
      });
    },
  };
}
