import {
  PaymentProvider,
  PaymentProviderType,
  PaymentProviderConfig,
  PaymentOrderRequest,
  PaymentOrderResponse,
  PaymentVerifyRequest,
  PaymentVerifyResponse,
  PaymentRefundRequest,
  PaymentRefundResponse,
} from '../../types/payment.types';
import { MockPaymentProvider } from './providers/mock.provider';
import { RazorpayProvider } from './providers/razorpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { CodPaymentProvider } from './providers/cod.provider';

export class PaymentEngine {
  private providers: Map<PaymentProviderType, PaymentProvider> = new Map();
  private storeConfigs: Map<string, PaymentProviderConfig[]> = new Map();

  constructor() {
    this.registerProvider(new MockPaymentProvider());
    this.registerProvider(new RazorpayProvider());
    this.registerProvider(new StripeProvider());
    this.registerProvider(new CodPaymentProvider());
  }

  registerProvider(provider: PaymentProvider): void {
    this.providers.set(provider.id, provider);
  }

  getProvider(type: PaymentProviderType): PaymentProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`Payment provider '${type}' is not registered.`);
    return provider;
  }

  getStorePaymentConfigs(storeId: string): PaymentProviderConfig[] {
    const existing = this.storeConfigs.get(storeId);
    if (existing) return existing;

    const defaultConfigs: PaymentProviderConfig[] = [
      {
        provider: 'mock',
        enabled: true,
        displayName: 'Test Gateway (Instant Simulator)',
        description: 'Simulates successful card/UPI payments without real funds',
        credentials: { mode: 'test' },
      },
      {
        provider: 'razorpay',
        enabled: false,
        displayName: 'Razorpay (Cards, UPI, Netbanking)',
        description: 'Accept payments across India via UPI, Cards, and Wallets',
        credentials: { mode: 'test' },
      },
      {
        provider: 'stripe',
        enabled: false,
        displayName: 'Stripe (Global Credit & Debit Cards)',
        description: 'Accept Apple Pay, Google Pay, and international cards',
        credentials: { mode: 'test' },
      },
      {
        provider: 'cod',
        enabled: true,
        displayName: 'Cash on Delivery (COD)',
        description: 'Pay with cash upon physical delivery',
        credentials: {},
      },
    ];

    this.storeConfigs.set(storeId, defaultConfigs);
    return defaultConfigs;
  }

  updateStorePaymentConfig(storeId: string, provider: PaymentProviderType, updates: Partial<PaymentProviderConfig>): PaymentProviderConfig {
    const configs = this.getStorePaymentConfigs(storeId);
    const target = configs.find((c) => c.provider === provider);
    if (!target) throw new Error(`Provider '${provider}' not configured for store '${storeId}'`);

    Object.assign(target, updates);
    if (updates.credentials) {
      target.credentials = { ...target.credentials, ...updates.credentials };
    }
    return target;
  }

  async createPaymentOrder(storeId: string, providerType: PaymentProviderType, request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    const configs = this.getStorePaymentConfigs(storeId);
    const config = configs.find((c) => c.provider === providerType);
    if (!config || !config.enabled) {
      throw new Error(`Payment method '${providerType}' is currently not enabled for this store.`);
    }

    const provider = this.getProvider(providerType);
    return provider.createPaymentOrder(request, config);
  }

  async verifyPayment(storeId: string, providerType: PaymentProviderType, request: PaymentVerifyRequest): Promise<PaymentVerifyResponse> {
    const configs = this.getStorePaymentConfigs(storeId);
    const config = configs.find((c) => c.provider === providerType);
    if (!config) throw new Error(`Provider config not found for '${providerType}'`);

    const provider = this.getProvider(providerType);
    return provider.verifyPayment(request, config);
  }

  async refundPayment(storeId: string, providerType: PaymentProviderType, request: PaymentRefundRequest): Promise<PaymentRefundResponse> {
    const configs = this.getStorePaymentConfigs(storeId);
    const config = configs.find((c) => c.provider === providerType);
    if (!config) throw new Error(`Provider config not found for '${providerType}'`);

    const provider = this.getProvider(providerType);
    return provider.refundPayment(request, config);
  }
}
