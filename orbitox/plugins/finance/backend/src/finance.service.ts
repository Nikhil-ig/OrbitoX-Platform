import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  getInvoices(contextId: string): any[] {
    this.logger.log(`Fetching invoices for context ${contextId}`);
    return [{ id: 'inv-1', invoiceNumber: 'INV-90210', totalAmount: 23600, status: 'ISSUED' }];
  }
}
