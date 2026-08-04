import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InAppAdapter {
  private readonly logger = new Logger(InAppAdapter.name);

  async sendInAppNotification(userId: string, body: string, contextId: string): Promise<void> {
    this.logger.log(`[InApp] Sending notification to user ${userId} (Context: ${contextId})`);
    this.logger.debug(`[InApp] Body: ${body}`);
    // Mock implementation for now - would typically save to DB and emit websocket event
  }
}
