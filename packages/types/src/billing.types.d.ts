/**
 * @module @orbitox/types/billing
 * Types for billing and subscriptions
 */
import { BaseEntity } from './common.types';
export interface Plan extends BaseEntity {
    name: string;
    description: string;
    price: number;
    currency: string;
    interval: 'month' | 'year';
    features: string[];
    limits: Record<string, number>;
    isActive: boolean;
}
export interface Subscription extends BaseEntity {
    planId: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid';
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    providerSubscriptionId: string;
}
export interface Invoice extends BaseEntity {
    subscriptionId: string;
    amount: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
    hostedInvoiceUrl?: string;
    invoicePdf?: string;
    paidAt?: Date;
}
/**
 * Abstraction interface for payment providers (Stripe, Razorpay, etc.)
 */
export interface PaymentProvider {
    createCustomer(email: string, name: string): Promise<string>;
    createSubscription(customerId: string, priceId: string): Promise<string>;
    cancelSubscription(subscriptionId: string): Promise<void>;
    constructWebhookEvent(payload: Buffer, signature: string, secret: string): unknown;
}
//# sourceMappingURL=billing.types.d.ts.map