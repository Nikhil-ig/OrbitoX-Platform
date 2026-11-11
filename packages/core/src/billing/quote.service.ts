import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { EventBusService } from '../events/event-bus.service';
import { SubscriptionService } from './subscription.service';

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  isRecurring: boolean;
  billingPeriod?: 'monthly' | 'yearly';
}

export interface Quote {
  id: string;
  contextId: string; // The tenant this quote is for
  salesRepId: string;
  status: QuoteStatus;
  items: QuoteLineItem[];
  validUntil: Date;
  totalAmount: number;
  recurringAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class QuoteService {
  private readonly logger = new Logger(QuoteService.name);
  // In a real system, this is backed by a database repository.
  private quotes = new Map<string, Quote>();

  constructor(
    private readonly eventBus: EventBusService,
    private readonly subscriptionService: SubscriptionService
  ) {}

  async createQuote(contextId: string, salesRepId: string, items: Omit<QuoteLineItem, 'id'>[], validityDays: number = 30): Promise<Quote> {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const quoteItems: QuoteLineItem[] = items.map(item => ({
      ...item,
      id: uuidv4()
    }));

    const totalAmount = quoteItems.reduce((sum, item) => !item.isRecurring ? sum + (item.quantity * item.unitPrice) : sum, 0);
    const recurringAmount = quoteItems.reduce((sum, item) => item.isRecurring ? sum + (item.quantity * item.unitPrice) : sum, 0);

    const quote: Quote = {
      id: uuidv4(),
      contextId,
      salesRepId,
      status: 'draft',
      items: quoteItems,
      validUntil,
      totalAmount,
      recurringAmount,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.quotes.set(quote.id, quote);
    this.logger.log(`Created draft quote ${quote.id} for context ${contextId}`);
    return quote;
  }

  async sendQuote(quoteId: string): Promise<Quote> {
    const quote = this.getQuote(quoteId);
    
    if (quote.status !== 'draft') {
      throw new BadRequestException(`Quote ${quoteId} cannot be sent as it is in ${quote.status} status.`);
    }

    quote.status = 'sent';
    quote.updatedAt = new Date();

    await this.eventBus.emit(
      'billing.quote.sent',
      { quoteId },
      quote.contextId,
      'billing-service'
    );

    return quote;
  }

  async acceptQuote(quoteId: string, customerId: string): Promise<Quote> {
    const quote = this.getQuote(quoteId);

    if (quote.status !== 'sent') {
      throw new BadRequestException(`Quote ${quoteId} must be in 'sent' status to be accepted.`);
    }

    if (new Date() > quote.validUntil) {
      quote.status = 'expired';
      throw new BadRequestException(`Quote ${quoteId} has expired.`);
    }

    quote.status = 'accepted';
    quote.updatedAt = new Date();

    this.logger.log(`Quote ${quoteId} accepted by context ${quote.contextId}`);

    // Automatically provision a custom subscription based on the accepted quote
    await this.subscriptionService.createCustomSubscription(
      quote.contextId,
      customerId,
      quote.items.filter(item => item.isRecurring),
      quoteId
    );

    await this.eventBus.emit(
      'billing.quote.accepted',
      { quoteId, totalAmount: quote.totalAmount, recurringAmount: quote.recurringAmount },
      quote.contextId,
      'billing-service'
    );

    return quote;
  }

  async rejectQuote(quoteId: string, reason?: string): Promise<Quote> {
    const quote = this.getQuote(quoteId);
    
    quote.status = 'rejected';
    quote.updatedAt = new Date();

    await this.eventBus.emit(
      'billing.quote.rejected',
      { quoteId, reason },
      quote.contextId,
      'billing-service'
    );

    return quote;
  }

  private getQuote(quoteId: string): Quote {
    const quote = this.quotes.get(quoteId);
    if (!quote) {
      throw new NotFoundException(`Quote ${quoteId} not found`);
    }
    return quote;
  }
}
