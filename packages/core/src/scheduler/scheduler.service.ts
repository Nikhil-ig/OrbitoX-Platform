import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private queue: any;
  private worker: any;

  private readonly connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  private handlers = new Map<string, (data: any) => Promise<void>>();

  async onModuleInit() {
    this.queue = new Queue('scheduler', { connection: this.connection });

    this.worker = new Worker(
      'scheduler',
      async (job) => {
        const handler = this.handlers.get(job.name);
        if (handler) {
          try {
            await handler(job.data);
          } catch (error: any) {
            this.logger.error(`Scheduled job ${job.name} failed: ${error.message}`);
            throw error;
          }
        } else {
          this.logger.warn(`No handler registered for scheduled job ${job.name}`);
        }
      },
      { connection: this.connection }
    );

    this.logger.log('Scheduler initialized');
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }

  /**
   * Registers a handler for a scheduled job type
   */
  registerHandler(jobName: string, handler: (data: any) => Promise<void>) {
    this.handlers.set(jobName, handler);
  }

  /**
   * Schedules a recurring job using a cron expression
   */
  async schedule(name: string, cron: string, data?: any): Promise<void> {
    await this.queue.add(name, data || {}, {
      repeat: { pattern: cron } as any, // Cast to any to handle different BullMQ versions
      jobId: `cron:${name}`,
    });
    this.logger.debug(`Scheduled cron job ${name} with pattern ${cron}`);
  }

  /**
   * Schedules a one-off delayed job
   */
  async scheduleOnce(name: string, delayMs: number, data?: any, options?: any): Promise<void> {
    await this.queue.add(name, data || {}, {
      delay: delayMs,
      jobId: `delayed:${name}:${Date.now()}`,
      ...options,
    });
    this.logger.debug(`Scheduled delayed job ${name} in ${delayMs}ms`);
  }

  /**
   * Removes a scheduled job
   */
  async unschedule(name: string): Promise<void> {
    if (typeof this.queue.getRepeatableJobs === 'function') {
      const repeatableJobs = await this.queue.getRepeatableJobs();
      const job = repeatableJobs.find((j: any) => j.name === name);
      if (job && typeof this.queue.removeRepeatableByKey === 'function') {
        await this.queue.removeRepeatableByKey(job.key);
        this.logger.debug(`Unscheduled job ${name}`);
      }
    }
  }
}
