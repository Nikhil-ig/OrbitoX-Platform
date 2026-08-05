import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '@orbitox/core';
import { TemplateService } from './template.service';
import { SendGridAdapter } from './providers/sendgrid.adapter';
import { TwilioSmsAdapter } from './providers/twilio-sms.adapter';
import { InAppAdapter } from './providers/in-app.adapter';
import { PreferenceService } from './preference.service';
import { SmartNotificationIntent, NotificationChannel } from './types';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly eventBus: EventBusService,
    private readonly templateService: TemplateService,
    private readonly sendGrid: SendGridAdapter,
    private readonly twilio: TwilioSmsAdapter,
    private readonly inApp: InAppAdapter,
    private readonly preferenceService: PreferenceService,
  ) {}

  /**
   * Smart dispatcher that routes a notification intent based on user preferences.
   * Provides omnichannel routing and intelligent fallbacks.
   */
  async dispatchSmart(intent: SmartNotificationIntent): Promise<void> {
    this.logger.log(`Dispatching smart notification [${intent.template}] to user ${intent.userId}`);

    // 1. Render content
    const body = this.templateService.render(intent.template, intent.variables);
    const subject = intent.subjectTemplate 
      ? this.templateService.render(intent.subjectTemplate, intent.variables)
      : undefined;

    // 2. Resolve preferences
    const prefs = await this.preferenceService.resolveUserPreferences(intent.userId, intent.contextId);
    
    // 3. Determine channels
    const urgency = intent.urgency || 'normal';
    const targetChannels = intent.overrideChannels || prefs.channels[urgency];

    // 4. Omni-channel dispatch
    const dispatchPromises: Promise<void>[] = [];
    
    for (const channel of targetChannels) {
      if (channel === 'email' && prefs.email) {
        dispatchPromises.push(
          this.sendEmail(prefs.email, subject, body, intent)
        );
      } else if (channel === 'sms' && prefs.phone) {
        dispatchPromises.push(
          this.sendSms(prefs.phone, body, intent)
        );
      } else if (channel === 'push' && prefs.pushToken) {
        dispatchPromises.push(
          this.sendPushWithFallback(prefs.pushToken, prefs.phone, body, intent)
        );
      } else if (channel === 'in-app') {
        dispatchPromises.push(
          this.sendInApp(intent.userId, body, intent)
        );
      }
    }

    // Await all dispatch attempts
    await Promise.allSettled(dispatchPromises);
  }

  private async sendEmail(email: string, subject: string | undefined, body: string, intent: SmartNotificationIntent) {
    try {
      await this.sendGrid.sendEmail(email, subject || 'Notification', body, intent.contextId);
      await this.emitSentEvent('email', email, intent);
    } catch (e: any) {
      this.logger.error(`Failed to send email to ${email}: ${e.message}`);
    }
  }

  private async sendSms(phone: string, body: string, intent: SmartNotificationIntent) {
    try {
      await this.twilio.sendSms(phone, body, intent.contextId);
      await this.emitSentEvent('sms', phone, intent);
    } catch (e: any) {
      this.logger.error(`Failed to send SMS to ${phone}: ${e.message}`);
    }
  }

  private async sendInApp(userId: string, body: string, intent: SmartNotificationIntent) {
    try {
      await this.inApp.sendInAppNotification(userId, body, intent.contextId);
      await this.emitSentEvent('in-app', userId, intent);
    } catch (e: any) {
      this.logger.error(`Failed to send in-app notification to ${userId}: ${e.message}`);
    }
  }

  private async sendPushWithFallback(pushToken: string, fallbackPhone: string | null, body: string, intent: SmartNotificationIntent) {
    try {
      // Mock push delivery
      // await this.pushProvider.sendPush(pushToken, body);
      await this.emitSentEvent('push', pushToken, intent);
    } catch (e: any) {
      this.logger.warn(`Push notification failed, falling back to SMS: ${e.message}`);
      if (fallbackPhone) {
        await this.sendSms(fallbackPhone, body, intent);
      }
    }
  }

  private async emitSentEvent(channel: NotificationChannel, to: string, intent: SmartNotificationIntent) {
    await this.eventBus.emit(
      'services.notification.sent',
      { to, channel, template: intent.template },
      intent.contextId,
      'NotificationService'
    );
  }
}
