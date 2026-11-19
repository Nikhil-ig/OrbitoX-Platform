import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { EventBusService } from '../events/event-bus.service';

export interface UsageRecord {
  contextId: string;
  metric: string; // e.g. 'ai_tokens', 'webhook_dispatches', 'api_calls'
  quantity: number;
  timestamp: Date;
}

@Injectable()
export class MeteringService implements OnModuleDestroy {
  private readonly logger = new Logger(MeteringService.name);
  
  // Buffer to aggregate high-throughput usage metrics in-memory
  // Map key: `${contextId}:${metric}` -> quantity
  private usageBuffer = new Map<string, number>();
  private flushInterval: NodeJS.Timeout;

  constructor(private readonly eventBus: EventBusService) {
    // Flush the buffer to the payment provider/database every 10 seconds
    // to prevent network congestion from rapid usage (e.g. loops)
    this.flushInterval = setInterval(() => this.flush(), 10000);
  }

  onModuleDestroy() {
    clearInterval(this.flushInterval);
    this.flush();
  }

  /**
   * Records usage for a specific tenant and metric.
   * This is extremely fast (O(1) memory operation) so it won't impact API latency.
   */
  recordUsage(contextId: string, metric: string, quantity: number): void {
    if (quantity <= 0) return;

    const key = `${contextId}:${metric}`;
    const current = this.usageBuffer.get(key) || 0;
    this.usageBuffer.set(key, current + quantity);
    
    this.logger.debug(`Buffered ${quantity} ${metric} for context ${contextId}`);
  }

  /**
   * Asynchronously flushes the aggregated usage to the EventBus and Payment Provider
   */
  private async flush(): Promise<void> {
    if (this.usageBuffer.size === 0) return;

    const snapshot = new Map(this.usageBuffer);
    this.usageBuffer.clear();

    for (const [key, totalQuantity] of snapshot.entries()) {
      const parts = key.split(':');
      const contextId = parts[0] as string;
      const metric = parts[1] as string;
      
      try {
        // In a real implementation, we would sync this with Stripe/Chargebee via this.paymentProvider
        // For now, we emit a platform event that a worker can reliably process
        await this.eventBus.emit(
          'billing.usage.recorded',
          { metric, quantity: totalQuantity },
          contextId,
          'metering-service'
        );
        this.logger.log(`Flushed ${totalQuantity} ${metric} for context ${contextId}`);
      } catch (err: any) {
        this.logger.error(`Failed to flush usage for ${key}: ${err.message}`);
        // Restore to buffer on failure
        const current = this.usageBuffer.get(key) || 0;
        this.usageBuffer.set(key, current + totalQuantity);
      }
    }
  }
}
