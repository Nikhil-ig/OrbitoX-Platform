import { Module } from '@nestjs/common';
import { SchedulerModule } from '@orbitox/core';
import { WebhookService } from './webhook.service';

@Module({
  imports: [SchedulerModule],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
