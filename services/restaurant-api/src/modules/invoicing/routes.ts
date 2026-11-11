import { RouteDefinition } from '../../http/routes';
import { sendJson, sendHtml, postgresStore } from '../../http/context';
import {
  buildGSTInvoice,
  computeFiscalYear,
  renderPrintableInvoiceHtml,
} from '../../shared/invoicing';

export const invoicingRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/restaurant/invoices',
    handler: async (req, res, context) => {
      const tid = context.tenantContext.tenantId;
      const orderIdQuery = context.parsedUrl.query.orderId as string;
      const numberQuery = (context.parsedUrl.query.number || context.parsedUrl.query.invoiceNumber) as string;

      if (!postgresStore) {
        sendJson(res, 503, {
          error: 'POSTGRES_STORE_UNAVAILABLE',
          message: 'PostgreSQL storage required for durable invoices.',
        });
        return;
      }

      if (orderIdQuery) {
        const invoice = await postgresStore.getInvoiceByOrderId(orderIdQuery, tid);
        if (!invoice) {
          sendJson(res, 404, { error: 'INVOICE_NOT_FOUND', message: `No invoice for order ${orderIdQuery}` });
          return;
        }
        sendJson(res, 200, { success: true, data: invoice });
        return;
      }

      if (numberQuery) {
        const invoice = await postgresStore.getInvoiceByNumber(numberQuery, tid);
        if (!invoice) {
          sendJson(res, 404, { error: 'INVOICE_NOT_FOUND', message: `No invoice with number ${numberQuery}` });
          return;
        }
        sendJson(res, 200, { success: true, data: invoice });
        return;
      }

      const invoices = await (postgresStore as any).prisma.invoice.findMany({
        where: { tenantId: tid },
        orderBy: { sequenceNumber: 'desc' },
        take: 50,
      });
      sendJson(res, 200, { success: true, count: invoices.length, data: invoices });
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/invoices/:id',
    handler: async (_req, res, context) => {
      const invoiceId = context.params.id;
      let invoice = await context.repo.getInvoiceByOrderId(invoiceId);
      if (!invoice && invoiceId.startsWith('INV-')) {
        invoice = await context.repo.getInvoiceByNumber(invoiceId);
      }
      if (!invoice && postgresStore) {
        invoice = await postgresStore.getInvoiceByOrderId(invoiceId, context.tenantContext.tenantId);
        if (!invoice && invoiceId.startsWith('INV-')) {
          invoice = await postgresStore.getInvoiceByNumber(invoiceId, context.tenantContext.tenantId);
        }
      }
      if (!invoice) {
        sendJson(res, 404, {
          error: 'INVOICE_NOT_FOUND',
          code: 'INVOICE_NOT_FOUND',
          message: `Invoice not found for identifier: ${invoiceId}`,
        });
        return;
      }

      if (context.parsedUrl.query.format === 'html') {
        const tenantBrand = await context.repo.getTenantBrand();
        const html = renderPrintableInvoiceHtml(invoice, tenantBrand, context.currentBranch);
        sendHtml(res, html);
        return;
      }

      sendJson(res, 200, { success: true, data: invoice });
    },
  },
  {
    method: 'POST',
    path: '/api/restaurant/invoices/generate',
    handler: async (req, res, context) => {
      const body = await context.parseBody();
      const orderId = body.orderId;
      if (!orderId) {
        sendJson(res, 400, { error: 'ORDER_ID_REQUIRED', message: 'orderId is required to generate invoice.' });
        return;
      }
      const tid = context.tenantContext.tenantId;
      const existing = await context.repo.getInvoiceByOrderId(orderId);
      if (existing) {
        sendJson(res, 200, { success: true, message: 'Invoice already exists', data: existing });
        return;
      }
      const order = await context.repo.getOrder(orderId);
      if (!order) {
        sendJson(res, 404, { error: 'ORDER_NOT_FOUND', message: `Order ${orderId} not found.` });
        return;
      }
      const { fiscalYear } = computeFiscalYear();
      const seq = await context.repo.getNextInvoiceSequence(fiscalYear);
      const tenantBrand = await context.repo.getTenantBrand();
      try {
        const invoiceRecord = buildGSTInvoice({
          order,
          sequenceNumber: seq,
          tenantId: tid,
          gstin: body.gstin,
          legalEntityName: body.legalEntityName,
          restaurantName: body.restaurantName,
          address: body.address,
          tenantBrand,
          branch: context.currentBranch,
          unregisteredInvoiceMode: body.unregisteredInvoiceMode,
          customerPhone: body.customerPhone,
          customerEmail: body.customerEmail,
          customerGstin: body.customerGstin,
        });
        await context.repo.saveInvoice(invoiceRecord);
        sendJson(res, 201, { success: true, data: invoiceRecord });
      } catch (invErr: any) {
        sendJson(res, 400, {
          error: invErr.code || 'GSTIN_REQUIRED',
          code: invErr.code || 'GSTIN_REQUIRED',
          message: invErr.message,
        });
      }
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/invoices/:id/print',
    handler: async (_req, res, context) => {
      const invoiceId = context.params.id;
      let invoice = await context.repo.getInvoiceByOrderId(invoiceId);
      if (!invoice && invoiceId.startsWith('INV-')) {
        invoice = await context.repo.getInvoiceByNumber(invoiceId);
      }
      if (!invoice && postgresStore) {
        invoice = await postgresStore.getInvoiceByOrderId(invoiceId, context.tenantContext.tenantId);
        if (!invoice && invoiceId.startsWith('INV-')) {
          invoice = await postgresStore.getInvoiceByNumber(invoiceId, context.tenantContext.tenantId);
        }
      }
      if (!invoice) {
        sendJson(res, 404, { success: false, error: 'INVOICE_NOT_FOUND' });
        return;
      }
      const tenantBrand = await context.repo.getTenantBrand();
      const html = renderPrintableInvoiceHtml(invoice, tenantBrand, context.currentBranch);
      sendHtml(res, html);
    },
  },
  {
    method: 'GET',
    path: '/api/restaurant/finance/reconciliation',
    handler: async (req, res, context) => {
      const identity = context.requestIdentity;
      if (identity.type === 'DINER' || (process.env.NODE_ENV === 'production' && !identity.isPrivileged)) {
        sendJson(res, identity.type === 'ANONYMOUS' ? 401 : 403, {
          error: 'FORBIDDEN',
          message: 'Financial reconciliation requires manager privileges.',
        });
        return;
      }
      const branchFilter = (context.parsedUrl.query.branchId as string) || undefined;
      const report = await context.repo.reconcileFinancialLedger(branchFilter);
      sendJson(res, 200, { success: true, data: report });
    },
  },
];
