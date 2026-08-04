import { Injectable } from '@nestjs/common';
import { PaymentProvider } from '@orbitox/types';
import { SecretsService } from '../../security/secrets.service';
// import Stripe from 'stripe';

@Injectable()
export class StripeAdapter implements PaymentProvider {
  // private stripe: Stripe;

  constructor(private readonly secretsService: SecretsService) {
    // Initialize in onModuleInit or lazily to support dynamic secrets
  }

  async createCustomer(email: string, name: string): Promise<string> {
    // const stripe = await this.getStripe();
    // const customer = await stripe.customers.create({ email, name });
    // return customer.id;
    return `cus_mock_${Date.now()}`;
  }

  async createSubscription(customerId: string, priceId: string): Promise<string> {
    // const stripe = await this.getStripe();
    // const subscription = await stripe.subscriptions.create({
    //   customer: customerId,
    //   items: [{ price: priceId }],
    // });
    // return subscription.id;
    return `sub_mock_${Date.now()}`;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    // const stripe = await this.getStripe();
    // await stripe.subscriptions.cancel(subscriptionId);
  }

  constructWebhookEvent(payload: Buffer, signature: string, secret: string): unknown {
    // const stripe = await this.getStripe();
    // return stripe.webhooks.constructEvent(payload, signature, secret);
    return { type: 'mock.event' };
  }

  private async getStripe(): Promise<any> {
    // const secretKey = await this.secretsService.get('billing/stripe/secret_key');
    // return new Stripe(secretKey, { apiVersion: '2023-10-16' });
    return {};
  }
}
