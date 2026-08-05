import { Module } from '@nestjs/common';
import { EventsModule } from '@orbitox/core';
import { NotificationService } from './notification.service';
import { TemplateService } from './template.service';
import { SendGridAdapter } from './providers/sendgrid.adapter';
import { TwilioSmsAdapter } from './providers/twilio-sms.adapter';
import { InAppAdapter } from './providers/in-app.adapter';
import { PreferenceService } from './preference.service';

@Module({
  imports: [EventsModule],
  providers: [
    NotificationService,
    TemplateService,
    SendGridAdapter,
    TwilioSmsAdapter,
    InAppAdapter,
    PreferenceService,
  ],
  exports: [NotificationService],
})
export class NotificationsModule {}
