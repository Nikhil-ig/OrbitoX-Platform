import type { InvoicingRepository } from './repository';
import { buildGSTInvoice, computeFiscalYear, renderPrintableInvoiceHtml } from '../../../packages/domain/invoicing';

export class InvoicingService {
  constructor(private repo: InvoicingRepository) {}

  buildInvoice(params: any) {
    return buildGSTInvoice(params);
  }
}
