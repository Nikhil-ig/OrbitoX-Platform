import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '@orbitox/core';
import { TemplateService } from './template.service';
import { SendGridAdapter } from './providers/sendgrid.adapter';
import { TwilioSmsAdapter } from './providers/twilio-sms.adapter';
import { InAppAdapter } from './providers/in-app.adapter';

export interface NotificationPayload {
  to: string; // email address, phone number, or userId
  type: 'email' | 'sms' | 'in-app';
  subject?: string;
  template: string;
  variables: Record<string, any>;
  contextId: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly templateService: TemplateService,
    private readonly sendGrid: SendGridAdapter,
    private readonly twilio: TwilioSmsAdapter,
    private readonly inApp: InAppAdapter,
  ) {}

  async dispatch(payload: NotificationPayload): Promise<void> {
    this.logger.log(`Dispatching ${payload.type} notification to ${payload.to}`);

    const body = this.templateService.render(payload.template, payload.variables);
    const subject = payload.subject 
      ? this.templateService.render(payload.subject, payload.variables)
      : undefined;

    switch (payload.type) {
      case 'email':
        await this.sendGrid.sendEmail(payload.to, subject || 'Notification', body, payload.contextId);
        break;
      case 'sms':
        await this.twilio.sendSms(payload.to, body, payload.contextId);
        break;
      case 'in-app':
        await this.inApp.sendInAppNotification(payload.to, body, payload.contextId);
        break;
      default:
        this.logger.error(`Unknown notification type: ${payload.type}`);
        throw new Error(`Unknown notification type: ${payload.type}`);
    }

    // Emit event that notification was sent
    await this.eventBus.emit(
      'services.notification.sent',
      {
        to: payload.to,
        type: payload.type,
      },
      payload.contextId,
      'NotificationService'
    );
  }
}
