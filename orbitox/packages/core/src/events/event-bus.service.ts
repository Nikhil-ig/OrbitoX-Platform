import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker, QueueEvents } from 'bullmq';
import { PlatformEvent } from '@orbitox/types';
import { v4 as uuidv4 } from 'uuid';

export interface EventOptions {
  correlationId?: string;
  causationId?: string;
  requestId?: string;
  version?: string;
  schemaVersion?: number;
}

@Injectable()
export class EventBusService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventBusService.name);
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly queueEvents: Map<string, QueueEvents> = new Map();

  // Assuming connection comes from env or a config service in real app
  private readonly connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  async onModuleInit() {
    this.logger.log('EventBus initialized');
  }

  async onModuleDestroy() {
    for (const worker of this.workers.values()) {
      await worker.close();
    }
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    for (const qe of this.queueEvents.values()) {
      await qe.close();
    }
  }

  /**
   * Gets or creates a queue for a specific domain (e.g., 'crm')
   */
  private getQueue(domain: string): Queue {
    if (!this.queues.has(domain)) {
      const queue = new Queue(`domain-${domain}`, { connection: this.connection });
      this.queues.set(domain, queue);
    }
    return this.queues.get(domain)!;
  }

  /**
   * Emits an event to the corresponding domain queue
   */
  async emit<T = Record<string, unknown>>(
    name: string,
    payload: T,
    contextId: string,
    source: string,
    userId?: string,
    options?: EventOptions,
  ): Promise<void> {
    const domain = name.split('.')[0] || 'default';
    const queue = this.getQueue(domain);

    const event: PlatformEvent<T> = {
      id: uuidv4(),
      name,
      version: options?.version || '1.0',
      schemaVersion: options?.schemaVersion || 1,
      contextId,
      userId,
      source: source || 'unknown',
      payload,
      correlationId: options?.correlationId || uuidv4(),
      causationId: options?.causationId,
      requestId: options?.requestId,
      occurredAt: new Date(),
      publishedAt: new Date(),
    };

    // Retry 3x with exponential backoff
    await queue.add(name, event, {
      jobId: event.id,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep in failed list (acts as DLQ)
    });

    this.logger.debug(`Emitted event ${name} [${event.id}]`);
  }

  /**
   * Registers a handler for a specific event
   */
  subscribe(
    eventName: string,
    handler: (event: PlatformEvent<any>) => Promise<void>,
    consumerName: string,
  ): void {
    const domain = eventName.split('.')[0];
    const workerName = `${domain}-${consumerName}`;

    // Create a worker for this domain if it doesn't exist
    // In a real distributed system, we would have consumer groups.
    // BullMQ supports this natively. Here we simulate it by just adding a worker.
    if (!this.workers.has(workerName)) {
      const worker = new Worker(
        `domain:${domain}`,
        async (job) => {
          if (job.name === eventName || eventName === '*') {
            try {
              await handler(job.data as PlatformEvent<any>);
            } catch (error: any) {
              this.logger.error(`Error processing event ${job.name} in ${consumerName}: ${error.message}`);
              throw error; // Let BullMQ handle retries
            }
          }
        },
        { connection: this.connection, concurrency: 10 }
      );

      worker.on('failed', (job, err) => {
        if (job && job.attemptsMade >= (job.opts.attempts || 1)) {
           this.logger.error(`Event ${job.name} [${job.id}] moved to DLQ. Error: ${err.message}`);
           // Here we could emit a system event or send to a specific DLQ queue
        }
      });

      this.workers.set(workerName, worker);
    }
  }
}
