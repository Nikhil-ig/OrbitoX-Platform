import { Module, Global } from '@nestjs/common';
import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { StripeAdapter } from './providers/stripe.adapter';

@Global()
@Module({
  providers: [
    {
      provide: 'PAYMENT_PROVIDER',
      useClass: StripeAdapter,
    },
    PlanService,
    SubscriptionService,
    InvoiceService,
  ],
  exports: [
    PlanService,
    SubscriptionService,
    InvoiceService,
    'PAYMENT_PROVIDER',
  ],
})
export class BillingModule {}
