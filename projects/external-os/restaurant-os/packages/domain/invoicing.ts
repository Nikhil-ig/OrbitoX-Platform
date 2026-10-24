/**
 * 🪐 Indian GST-Compliant Invoicing Service for RestaurantOS
 *
 * Implements statutory Indian GST compliance for Restaurant & Food Services:
 * - SAC Code 996331 ("Restaurant and other food service providers")
 * - 5% Composite GST (2.5% CGST + 2.5% SGST)
 * - Sequential Fiscal Year Numbering: INV-YYYYYY-XXXXXX (e.g. INV-202627-000001)
 * - Zero gap tolerance per tenant & fiscal year
 * - Strict multi-tenant data partitioning
 */

import { getActiveTenant } from './tenancy';

export const SAC_RESTAURANT_SERVICES = '996331';
export const SAC_DESCRIPTION = 'Services provided by restaurants, cafes, and other eating establishments';
export const DEFAULT_PILOT_GSTIN = '27AAPFU0939F1ZV'; // Valid Maharashtra GSTIN format for pilot

export interface InvoiceItem {
  id: string;
  name: string;
  sacCode: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
  taxRate: string;
}

export interface TaxBreakdown {
  sacCode: string;
  sacDescription: string;
  cgstBasisPoints: number;
  cgstRate: string;
  cgstMinor: number;
  sgstBasisPoints: number;
  sgstRate: string;
  sgstMinor: number;
  totalTaxMinor: number;
}

export interface InvoiceCustomer {
  name?: string;
  tableNumber?: string;
  branchId?: string;
  phone?: string;
  email?: string;
  customerGstin?: string;
}

export interface InvoiceRecord {
  id?: string;
  tenantId: string;
  orderId: string;
  invoiceNumber: string;
  fiscalYear: string;
  sequenceNumber: number;
  gstin: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  currency: string;
  itemBreakdown: InvoiceItem[];
  taxBreakdown: TaxBreakdown;
  customer?: InvoiceCustomer;
  createdAt?: string | Date;
}

/**
 * Computes Indian Fiscal Year (April 1 - March 31).
 * E.g., October 2026 -> FY 2026-2027 -> code: "202627", fiscalYear: "2026-2027"
 */
export function computeFiscalYear(date: Date = new Date()): { fiscalYear: string; code: string } {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth(); // 0 = Jan, 3 = April

  let startYear: number;
  let endYear: number;

  if (month >= 3) {
    // April 1st to Dec 31st
    startYear = year;
    endYear = year + 1;
  } else {
    // Jan 1st to March 31st
    startYear = year - 1;
    endYear = year;
  }

  const code = `${startYear}${String(endYear).slice(-2)}`;
  const fiscalYear = `${startYear}-${endYear}`;
  return { fiscalYear, code };
}

/**
 * Formats standard sequential invoice identifier: INV-YYYYYY-XXXXXX
 */
export function formatInvoiceNumber(code: string, sequenceNumber: number): string {
  const padded = String(sequenceNumber).padStart(6, '0');
  return `INV-${code}-${padded}`;
}

export interface BuildInvoiceParams {
  order: {
    orderId: string;
    tableNumber?: string;
    branchId?: string;
    guestName?: string;
    items: Array<{
      id: string;
      name: string;
      quantity?: number;
      unitPriceMinor: number;
    }>;
    subtotalMinor?: number;
    currency?: string;
  };
  sequenceNumber: number;
  gstin?: string;
  tenantId?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerGstin?: string;
  date?: Date;
}

/**
 * Builds a certified Indian GST-compliant invoice record from an order.
 */
export function buildGSTInvoice(params: BuildInvoiceParams): InvoiceRecord {
  const tid = params.tenantId || getActiveTenant().tenantId;
  const gstin = params.gstin || process.env.RESTAURANT_GSTIN || 'UNREGISTERED';
  const date = params.date || new Date();
  const { fiscalYear, code } = computeFiscalYear(date);
  const invoiceNumber = formatInvoiceNumber(code, params.sequenceNumber);

  let subtotalMinor = 0;
  const itemBreakdown: InvoiceItem[] = (params.order.items || []).map((it) => {
    const qty = it.quantity || 1;
    const itemTotal = it.unitPriceMinor * qty;
    subtotalMinor += itemTotal;
    return {
      id: it.id,
      name: it.name,
      sacCode: SAC_RESTAURANT_SERVICES,
      quantity: qty,
      unitPriceMinor: it.unitPriceMinor,
      totalMinor: itemTotal,
      taxRate: '5%',
    };
  });

  // If order had explicit subtotal and differs from computed item breakdown (e.g. modifiers)
  if (params.order.subtotalMinor && params.order.subtotalMinor > 0) {
    subtotalMinor = params.order.subtotalMinor;
  }

  // 5% Restaurant GST split equally into 2.5% CGST and 2.5% SGST
  const cgstMinor = Math.round((subtotalMinor * 250) / 10000);
  const sgstMinor = Math.round((subtotalMinor * 250) / 10000);
  const taxMinor = cgstMinor + sgstMinor;
  const totalMinor = subtotalMinor + taxMinor;

  const taxBreakdown: TaxBreakdown = {
    sacCode: SAC_RESTAURANT_SERVICES,
    sacDescription: SAC_DESCRIPTION,
    cgstBasisPoints: 250,
    cgstRate: '2.5%',
    cgstMinor,
    sgstBasisPoints: 250,
    sgstRate: '2.5%',
    sgstMinor,
    totalTaxMinor: taxMinor,
  };

  const customer: InvoiceCustomer = {
    name: params.order.guestName || 'Diner',
    tableNumber: params.order.tableNumber,
    branchId: params.order.branchId,
    phone: params.customerPhone,
    email: params.customerEmail,
    customerGstin: params.customerGstin,
  };

  return {
    tenantId: tid,
    orderId: params.order.orderId,
    invoiceNumber,
    fiscalYear,
    sequenceNumber: params.sequenceNumber,
    gstin,
    subtotalMinor,
    taxMinor,
    totalMinor,
    currency: params.order.currency || 'INR',
    itemBreakdown,
    taxBreakdown,
    customer,
    createdAt: date.toISOString(),
  };
}

/**
 * Renders a statutory Indian GST Tax Invoice HTML document for print / PDF output.
 * Fully compliant with SAC 996331, composite 5% GST (2.5% CGST + 2.5% SGST).
 */
export function renderPrintableInvoiceHtml(
  invoice: InvoiceRecord,
  brand?: any,
  branch?: any
): string {
  const restaurantName = brand?.restaurantName || 'OrbitoX Bistro';
  const legalEntityName = brand?.legalEntityName || restaurantName;
  const gstin = invoice.gstin || brand?.gstin || '27AAPFU0939F1ZV';
  const branchAddress = branch?.address ? `${branch.address}, ${branch?.city || ''}` : (brand?.address || 'Main Promenade, Sector 14');
  const currencySymbol = invoice.currency === 'INR' ? '₹' : (invoice.currency || '₹');

  const items = invoice.itemBreakdown || [];
  const tax = invoice.taxBreakdown || {
    sacCode: SAC_RESTAURANT_SERVICES,
    sacDescription: SAC_DESCRIPTION,
    cgstRate: '2.5%',
    cgstMinor: Math.round(invoice.taxMinor / 2),
    sgstRate: '2.5%',
    sgstMinor: Math.round(invoice.taxMinor / 2),
    totalTaxMinor: invoice.taxMinor,
  };

  const invoiceDate = invoice.createdAt ? new Date(invoice.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }) : new Date().toLocaleString('en-IN');

  const itemsHtml = items.map((item, idx) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; color: #6B7280; font-size: 13px;">${idx + 1}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; font-weight: 600; color: #111827; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; font-family: monospace; color: #4B5563; font-size: 13px;">${item.sacCode || SAC_RESTAURANT_SERVICES}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: center; font-weight: 600; color: #111827; font-size: 14px;">${item.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; color: #374151; font-size: 14px;">${currencySymbol}${(item.unitPriceMinor / 100).toFixed(2)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #E5E7EB; text-align: right; font-weight: 700; color: #111827; font-size: 14px;">${currencySymbol}${(item.totalMinor / 100).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice · ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background: #F9FAFB;
      margin: 0;
      padding: 32px 16px;
    }
    .invoice-card {
      max-width: 800px;
      margin: 0 auto;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    .meta-box {
      background: #F3F4F6;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 12px;
    }
    .meta-item {
      font-size: 13px;
    }
    .meta-label {
      color: #6B7280;
      text-transform: uppercase;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .meta-value {
      color: #111827;
      font-weight: 700;
      margin-top: 2px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    table.data-table th {
      background: #F8FAFC;
      padding: 10px 12px;
      border-bottom: 2px solid #E2E8F0;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
    }
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-top: 16px;
    }
    .totals-table {
      width: 320px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 6px 10px;
      font-size: 14px;
    }
    .totals-table tr.grand-total td {
      border-top: 2px solid #111827;
      font-size: 16px;
      font-weight: 800;
      color: #111827;
      padding-top: 10px;
    }
    .compliance-footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px dashed #D1D5DB;
      font-size: 12px;
      color: #6B7280;
      text-align: center;
      line-height: 1.6;
    }
    .no-print-bar {
      max-width: 800px;
      margin: 0 auto 20px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #C86B3C;
      color: #FFFFFF;
      border: none;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print:hover {
      background: #A85428;
    }
    @media print {
      body {
        background: #FFFFFF;
        padding: 0;
      }
      .invoice-card {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print-bar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <a href="/operations/orders" style="color: #6B7280; text-decoration: none; font-size: 14px; font-weight: 600;">← Back to Operations</a>
    <button class="btn-print" onclick="window.print()">🖨️ Print Tax Invoice</button>
  </div>

  <div class="invoice-card">
    <table class="header-table">
      <tr>
        <td style="vertical-align: top;">
          ${brand?.logoUrl ? `<img src="${brand.logoUrl}" alt="${restaurantName}" style="max-height: 48px; margin-bottom: 8px; display: block;" />` : ''}
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #111827;">${restaurantName}</h1>
          <div style="font-size: 13px; color: #4B5563; margin-top: 4px;">${legalEntityName}</div>
          <div style="font-size: 13px; color: #6B7280; margin-top: 2px;">${branchAddress}</div>
          <div style="font-size: 13px; font-weight: 700; color: #1F2937; margin-top: 6px;">GSTIN: <span style="font-family: monospace;">${gstin}</span></div>
        </td>
        <td style="vertical-align: top; text-align: right;">
          <div style="font-size: 20px; font-weight: 800; color: #C86B3C; letter-spacing: 0.05em;">TAX INVOICE</div>
          <div style="font-size: 15px; font-weight: 700; color: #111827; margin-top: 6px; font-family: monospace;">${invoice.invoiceNumber}</div>
          <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">Date: ${invoiceDate}</div>
          <div style="font-size: 12px; color: #6B7280;">FY: ${invoice.fiscalYear || '2026-2027'}</div>
        </td>
      </tr>
    </table>

    <div class="meta-box">
      <div class="meta-item">
        <div class="meta-label">Billed To</div>
        <div class="meta-value">${invoice.customer?.name || 'Walk-in Diner'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Table / Counter</div>
        <div class="meta-value">${invoice.customer?.tableNumber || 'Takeaway'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-label">Order Ref</div>
        <div class="meta-value" style="font-family: monospace;">${invoice.orderId}</div>
      </div>
      ${invoice.customer?.customerGstin ? `
      <div class="meta-item">
        <div class="meta-label">Customer GSTIN</div>
        <div class="meta-value" style="font-family: monospace;">${invoice.customer.customerGstin}</div>
      </div>` : ''}
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="text-align: center; width: 40px;">#</th>
          <th style="text-align: left;">Item Description</th>
          <th style="text-align: center; width: 80px;">SAC</th>
          <th style="text-align: center; width: 60px;">Qty</th>
          <th style="text-align: right; width: 90px;">Rate</th>
          <th style="text-align: right; width: 100px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td style="color: #4B5563;">Taxable Value</td>
          <td style="text-align: right; font-weight: 600;">${currencySymbol}${(invoice.subtotalMinor / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #4B5563;">CGST @ ${tax.cgstRate || '2.5%'}</td>
          <td style="text-align: right; font-weight: 600;">${currencySymbol}${(tax.cgstMinor / 100).toFixed(2)}</td>
        </tr>
        <tr>
          <td style="color: #4B5563;">SGST @ ${tax.sgstRate || '2.5%'}</td>
          <td style="text-align: right; font-weight: 600;">${currencySymbol}${(tax.sgstMinor / 100).toFixed(2)}</td>
        </tr>
        <tr class="grand-total">
          <td>Grand Total</td>
          <td style="text-align: right;">${currencySymbol}${(invoice.totalMinor / 100).toFixed(2)}</td>
        </tr>
      </table>
    </div>

    <div class="compliance-footer">
      <div>Tax Category: SAC 996331 — Restaurant & Food Hospitality Services (5% Composite GST).</div>
      <div style="margin-top: 4px;">Thank you for dining with ${restaurantName}! This is a computer generated invoice requiring no physical signature.</div>
    </div>
  </div>
</body>
</html>`;
}
