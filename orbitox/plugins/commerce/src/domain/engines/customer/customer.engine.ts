import { Customer } from '../../types/customer.types';
import { Address } from '../../types/order.types';

export class CustomerEngine {
  private customers: Map<string, Customer> = new Map();

  constructor(initialCustomers: Customer[] = []) {
    for (const c of initialCustomers) this.customers.set(c.id, c);

    if (this.customers.size === 0) {
      const now = new Date().toISOString();
      const demo: Customer[] = [
        {
          id: 'cust_1',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          email: 'alex.vance@beverlyhills.com',
          phone: '+1 (310) 555-0192',
          firstName: 'Alex',
          lastName: 'Vance',
          totalOrders: 4,
          totalSpent: 3420.0,
          lastOrderAt: now,
          addresses: [
            {
              firstName: 'Alex',
              lastName: 'Vance',
              addressLine1: '742 Rodeo Drive, Penthouse 4',
              city: 'Beverly Hills',
              state: 'CA',
              postalCode: '90210',
              country: 'United States',
              phone: '+1 (310) 555-0192',
            },
          ],
          tags: ['vip', 'high-value', 'repeat buyer'],
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'cust_2',
          storeId: 'store_aura_luxury',
          tenantId: 'tenant_aura_corp',
          email: 'claire.delacroix@paris.fr',
          phone: '+33 1 42 68 55 00',
          firstName: 'Claire',
          lastName: 'Delacroix',
          totalOrders: 2,
          totalSpent: 1250.0,
          lastOrderAt: now,
          addresses: [
            {
              firstName: 'Claire',
              lastName: 'Delacroix',
              addressLine1: '18 Rue du Faubourg Saint-Honoré',
              city: 'Paris',
              state: 'Île-de-France',
              postalCode: '75008',
              country: 'France',
              phone: '+33 1 42 68 55 00',
            },
          ],
          tags: ['vip', 'international'],
          createdAt: now,
          updatedAt: now,
        },
      ];

      for (const c of demo) this.customers.set(c.id, c);
    }
  }

  upsertCustomer(
    storeId: string,
    payload: Partial<Customer> & { email: string; firstName: string }
  ): Customer {
    const cleanEmail = payload.email.toLowerCase().trim();
    let customer = Array.from(this.customers.values()).find(
      (c) => c.storeId === storeId && c.email.toLowerCase() === cleanEmail
    );

    const now = new Date().toISOString();

    if (!customer) {
      customer = {
        id: payload.id || `cust_${globalThis.crypto.randomUUID()}`,
        storeId,
        tenantId: payload.tenantId || 'tenant_aura_corp',
        email: cleanEmail,
        phone: payload.phone || '',
        firstName: payload.firstName,
        lastName: payload.lastName || '',
        totalOrders: payload.totalOrders || 0,
        totalSpent: payload.totalSpent || 0,
        lastOrderAt: payload.lastOrderAt || now,
        addresses: payload.addresses || [],
        tags: payload.tags || ['patron'],
        createdAt: now,
        updatedAt: now,
      };
      this.customers.set(customer.id, customer);
    } else {
      if (payload.firstName) customer.firstName = payload.firstName;
      if (payload.lastName) customer.lastName = payload.lastName;
      if (payload.phone) customer.phone = payload.phone;
      if (payload.tags) customer.tags = payload.tags;
      if (payload.addresses) customer.addresses = payload.addresses;
      customer.updatedAt = now;
    }

    return customer;
  }

  recordCustomerOrder(
    storeId: string,
    tenantId: string,
    payload: {
      email: string;
      phone?: string;
      firstName: string;
      lastName: string;
      address: Address;
      orderTotal: number;
    }
  ): Customer {
    const cleanEmail = payload.email.toLowerCase().trim();
    let customer = Array.from(this.customers.values()).find(
      (c) => c.storeId === storeId && c.email.toLowerCase() === cleanEmail
    );

    const now = new Date().toISOString();

    if (!customer) {
      customer = {
        id: `cust_${globalThis.crypto.randomUUID()}`,
        storeId,
        tenantId,
        email: cleanEmail,
        phone: payload.phone,
        firstName: payload.firstName,
        lastName: payload.lastName,
        totalOrders: 1,
        totalSpent: payload.orderTotal,
        lastOrderAt: now,
        addresses: [payload.address],
        tags: ['new customer'],
        createdAt: now,
        updatedAt: now,
      };
      this.customers.set(customer.id, customer);
    } else {
      customer.totalOrders += 1;
      customer.totalSpent += payload.orderTotal;
      customer.lastOrderAt = now;
      customer.updatedAt = now;

      // Update tags
      if (customer.totalSpent > 1000 && !customer.tags.includes('vip')) {
        customer.tags.push('vip');
      }
      if (customer.totalOrders >= 3 && !customer.tags.includes('repeat buyer')) {
        customer.tags.push('repeat buyer');
      }
    }

    return customer;
  }

  listCustomersByStore(storeId: string): Customer[] {
    return Array.from(this.customers.values()).filter((c) => c.storeId === storeId);
  }

  getCustomerById(customerId: string): Customer | null {
    return this.customers.get(customerId) || null;
  }
}
