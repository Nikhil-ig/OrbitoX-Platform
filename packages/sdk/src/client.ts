/**
 * 🪐 OrbitoX SDK - Main Client
 */

import { HttpTransport, TransportConfig } from './transport';
import { TenantsResource } from './tenants';
import { OperationsResource } from './operations';
import { HospitalOsClient } from './plugins/hospital-os';
import { RestaurantOsClient } from './plugins/restaurant-os';

export interface OrbitoXClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  maxRetries?: number;
  restaurantUrl?: string;
  hospitalUrl?: string;
  fetch?: typeof globalThis.fetch;
}

export class OrbitoXClient {
  readonly transport: HttpTransport;
  readonly tenants: TenantsResource;
  readonly operations: OperationsResource;
  readonly options: OrbitoXClientOptions;

  constructor(options: OrbitoXClientOptions = {}) {
    this.options = {
      baseUrl: options.baseUrl || process.env.ORBITOX_URL || 'http://127.0.0.1:3005',
      apiKey: options.apiKey || process.env.ORBITOX_API_KEY || process.env.ORBITOX_CUSTOMER_API_KEY,
      timeoutMs: options.timeoutMs ?? 15000,
      maxRetries: options.maxRetries ?? 3,
      restaurantUrl: options.restaurantUrl || process.env.RESTAURANTOS_URL || process.env.RESTAURANT_URL,
      hospitalUrl: options.hospitalUrl || process.env.HOSPITALOS_URL,
      fetch: options.fetch,
    };

    this.transport = new HttpTransport({
      baseUrl: this.options.baseUrl!,
      apiKey: this.options.apiKey,
      timeoutMs: this.options.timeoutMs,
      maxRetries: this.options.maxRetries,
      fetch: this.options.fetch,
    });

    this.operations = new OperationsResource(this.transport);
    this.tenants = new TenantsResource(this.transport, this.operations);
  }

  plugin(pluginName: 'hospital-os' | 'hms' | '@orbitox/hms' | '@orbitox-io/hms'): {
    forTenant(tenantId: string, options?: { apiKey?: string }): HospitalOsClient;
  };
  plugin(pluginName: 'restaurant-os' | 'restaurant' | '@orbitox/restaurant' | '@orbitox-io/restaurant'): {
    forTenant(tenantId: string, options?: { apiKey?: string }): RestaurantOsClient;
  };
  plugin(pluginName: string): {
    forTenant(tenantId: string, options?: { apiKey?: string }): any;
  };
  plugin(pluginName: string) {
    const canonical = pluginName.replace(/^@orbitox(-io)?\//, '').toLowerCase();

    return {
      forTenant: (tenantId: string, opts: { apiKey?: string; headers?: Record<string, string> } = {}) => {
        const customHeaders: Record<string, string> = { ...(opts.headers || {}) };
        if (opts.apiKey) {
          customHeaders['x-api-key'] = opts.apiKey;
          customHeaders['Authorization'] = `Bearer ${opts.apiKey}`;
        }

        if (canonical === 'hospital-os' || canonical === 'hms') {
          return new HospitalOsClient(this.transport, tenantId, customHeaders);
        }

        if (canonical === 'restaurant-os' || canonical === 'restaurant') {
          return new RestaurantOsClient(
            this.transport,
            tenantId,
            this.options.restaurantUrl,
            customHeaders
          );
        }

        throw new Error(
          `Plugin "${pluginName}" does not have a dedicated typed client. Supported: 'hospital-os', 'restaurant-os'.`
        );
      },
    };
  }
}

export function createOrbitoXClient(options: OrbitoXClientOptions = {}): OrbitoXClient {
  return new OrbitoXClient(options);
}
