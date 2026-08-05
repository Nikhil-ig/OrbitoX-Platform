import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';
import { PlatformEvent } from '@orbitox/types';
import { SchedulerService } from '@orbitox/core';

export interface WebhookEndpoint {
  id: string;
  contextId: string;
  url: string;
  secret: string;
  events: string[]; // e.g. ['crm.lead.created', 'billing.*']
  isActive: boolean;
}

export interface WebhookDispatchPayload {
  endpoint: WebhookEndpoint;
  event: PlatformEvent<any>;
}

@Injectable()
export class WebhookService implements OnModuleInit {
  private readonly logger = new Logger(WebhookService.name);
  // In a real system, this would be backed by a database repository.
  private endpoints: WebhookEndpoint[] = [];

  constructor(private readonly schedulerService: SchedulerService) {}

  async onModuleInit() {
    this.schedulerService.registerHandler('webhook.dispatch', async (data: WebhookDispatchPayload) => {
      await this.processWebhookDispatch(data);
    });
  }

  registerEndpoint(endpoint: WebhookEndpoint): void {
    this.endpoints.push(endpoint);
    this.logger.log(`Registered webhook endpoint for context ${endpoint.contextId}: ${endpoint.url}`);
  }

  getEndpointsForContext(contextId: string): WebhookEndpoint[] {
    return this.endpoints.filter((ep) => ep.contextId === contextId && ep.isActive);
  }

  async dispatchEvent(event: PlatformEvent<any>): Promise<void> {
    const endpoints = this.getEndpointsForContext(event.contextId);

    for (const endpoint of endpoints) {
      if (this.shouldDispatch(endpoint, event.name)) {
        await this.queueWebhook(endpoint, event);
      }
    }
  }

  private shouldDispatch(endpoint: WebhookEndpoint, eventName: string): boolean {
    return endpoint.events.some((pattern) => {
      if (pattern === '*') return true;
      if (pattern.endsWith('.*')) {
        const prefix = pattern.slice(0, -2);
        return eventName.startsWith(prefix);
      }
      return pattern === eventName;
    });
  }

  private async queueWebhook(endpoint: WebhookEndpoint, event: PlatformEvent<any>): Promise<void> {
    const payload: WebhookDispatchPayload = { endpoint, event };
    
    // Dispatch immediately, but configured with exponential backoff for resilience
    await this.schedulerService.scheduleOnce('webhook.dispatch', 0, payload, {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 5000,
      }
    });
    
    this.logger.debug(`Queued webhook ${event.name} for ${endpoint.url}`);
  }

  private async processWebhookDispatch(data: WebhookDispatchPayload): Promise<void> {
    const { endpoint, event } = data;
    const payload = JSON.stringify(event);
    const signature = this.generateSignature(payload, endpoint.secret);

    this.logger.debug(`Dispatching webhook ${event.name} to ${endpoint.url}`);
    
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-OrbitoX-Signature': signature,
        'X-OrbitoX-Event': event.name,
        'X-OrbitoX-Delivery': event.id,
      },
      body: payload,
      // Short timeout for webhooks to prevent holding up resources
      signal: AbortSignal.timeout(5000), 
    });

    if (!response.ok) {
      this.logger.warn(`Webhook to ${endpoint.url} failed with status ${response.status}`);
      // Throwing an error allows BullMQ to catch it and trigger the exponential backoff retry strategy
      throw new Error(`Webhook dispatch failed with HTTP ${response.status}`);
    }
    
    this.logger.log(`Successfully dispatched webhook ${event.name} to ${endpoint.url}`);
  }

  private generateSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }
}
