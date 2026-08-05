import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Subscription, PaymentProvider } from '@orbitox/types';
import { EventBusService } from '../events/event-bus.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class SubscriptionService {
  private subscriptions = new Map<string, Subscription>();

  constructor(
    @Inject('PAYMENT_PROVIDER') private readonly paymentProvider: PaymentProvider,
    private readonly eventBus: EventBusService,
  ) {}

  async createSubscription(contextId: string, planId: string, customerId: string, stripePriceId: string): Promise<Subscription> {
    const providerSubId = await this.paymentProvider.createSubscription(customerId, stripePriceId);

    const sub: Subscription = {
      id: uuidv4(),
      contextId,
      planId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days mock
      cancelAtPeriodEnd: false,
      providerSubscriptionId: providerSubId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(sub.id, sub);

    await this.eventBus.emit(
      'billing.subscription.activated',
      { subscriptionId: sub.id, planId, contextId },
      contextId,
      'billing-service'
    );

    return sub;
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    const sub = this.subscriptions.get(subscriptionId);
    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    await this.paymentProvider.cancelSubscription(sub.providerSubscriptionId);
    
    sub.status = 'canceled';
    sub.updatedAt = new Date();

    await this.eventBus.emit(
      'billing.subscription.cancelled',
      { subscriptionId, reason: 'user_requested' },
      sub.contextId,
      'billing-service'
    );
  }

  async createCustomSubscription(
    contextId: string, 
    customerId: string, 
    recurringItems: any[], // Type corresponds to QuoteLineItem
    quoteId: string
  ): Promise<Subscription> {
    // In a real implementation, we would map the recurring items to custom Stripe prices or a custom plan.
    // For this engine, we mock the payment provider creation.
    const providerSubId = await this.paymentProvider.createSubscription(customerId, 'custom_price_mock');

    const sub: Subscription = {
      id: uuidv4(),
      contextId,
      planId: `custom-from-quote-${quoteId}`,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days mock
      cancelAtPeriodEnd: false,
      providerSubscriptionId: providerSubId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(sub.id, sub);

    await this.eventBus.emit(
      'billing.subscription.custom_activated',
      { subscriptionId: sub.id, quoteId, contextId },
      contextId,
      'billing-service'
    );

    return sub;
  }
}
