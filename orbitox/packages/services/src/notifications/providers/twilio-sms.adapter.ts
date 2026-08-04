import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TwilioSmsAdapter {
  private readonly logger = new Logger(TwilioSmsAdapter.name);

  async sendSms(to: string, body: string, contextId: string): Promise<void> {
    this.logger.log(`[Twilio] Sending SMS to ${to} (Context: ${contextId})`);
    this.logger.debug(`[Twilio] Body: ${body}`);
    // Mock implementation for now
  }
}
