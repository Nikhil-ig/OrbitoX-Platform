import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SendGridAdapter {
  private readonly logger = new Logger(SendGridAdapter.name);

  async sendEmail(to: string, subject: string, body: string, contextId: string): Promise<void> {
    this.logger.log(`[SendGrid] Sending email to ${to} (Context: ${contextId})`);
    this.logger.debug(`[SendGrid] Subject: ${subject}`);
    this.logger.debug(`[SendGrid] Body: ${body}`);
    // Mock implementation for now
  }
}
