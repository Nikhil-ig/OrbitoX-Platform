import { Module, Global } from '@nestjs/common';
import { PlanService } from './plan.service';
import { SubscriptionService } from './subscription.service';
import { InvoiceService } from './invoice.service';
import { MeteringService } from './metering.service';
import { QuoteService } from './quote.service';
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
    MeteringService,
    QuoteService,
  ],
  exports: [
    PlanService,
    SubscriptionService,
    InvoiceService,
    MeteringService,
    QuoteService,
    'PAYMENT_PROVIDER',
  ],
})
export class BillingModule {}
