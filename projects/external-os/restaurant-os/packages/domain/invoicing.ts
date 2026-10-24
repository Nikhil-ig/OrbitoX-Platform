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
