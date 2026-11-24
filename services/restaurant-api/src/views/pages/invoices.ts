/**
 * 🪐 RestaurantOS Modern — Invoices & GST Management (SCR-OPS-INVOICES)
 * ─────────────────────────────────────────────────────────────────────────────
 * Matches 'Invoices & GST · desktop.png':
 * - Top summary row: Dark GST Collected card + Attention card (uninvoiced orders)
 * - Month filter & live search bar + GST CSV export
 * - Live invoice ledger backed by PostgreSQL `Invoice` & `Order` tables
 * - 1-click Generate GST Invoice (`POST /api/restaurant/invoices/generate`) & Print (`GET /api/restaurant/invoices/:id/print`)
 */

import { BranchRecord, RestaurantOrder } from '../../shared';
import { InvoiceRecord } from '../../shared/invoicing';

export function renderInvoicesWorkspace(
  invoices: InvoiceRecord[] = [],
  orders: RestaurantOrder[] = [],
  tenantBrand: any = {},
  branches: BranchRecord[] = [],
  currentBranchId = 'branch_ldh',
  tenantName = 'RestaurantOS'
): string {
  const currentBranch = branches.find((b) => b.id === currentBranchId) || branches[0];
  const branchName = currentBranch?.name || 'Main Dining';
  const gstin = tenantBrand?.gstin || (currentBranch as any)?.gstin || 'Unregistered / Configure GSTIN in Settings';

  const invoicedOrderIds = new Set(invoices.map((inv) => inv.orderId));
  const pendingOrders = orders.filter(
    (o) =>
      !o.isTest &&
      ['COMPLETED', 'SERVED', 'PAID'].includes(String(o.status || '').toUpperCase()) &&
      !invoicedOrderIds.has(o.orderId)
  );

  const totalTaxMinor = invoices.reduce((sum, inv) => sum + (Number(inv.taxMinor) || 0), 0);
  const totalSalesMinor = invoices.reduce((sum, inv) => sum + (Number(inv.subtotalMinor) || 0), 0);

  const formatInr = (minor: number): string => {
    const val = Math.round((Number(minor) || 0) / 100);
    return `₹${val.toLocaleString('en-IN')}`;
  };

  return `
  <div class="inv-page">
    <!-- Top Header -->
    <div class="inv-header">
      <div>
        <div class="inv-eyebrow">GSTIN ${escapeHtml(String(gstin))} · ${escapeHtml(branchName)}</div>
        <h1 class="inv-title">Invoices &amp; GST</h1>
      </div>
      <div class="inv-header-actions">
        <button type="button" class="btn btn-secondary" onclick="exportInvoicesCsv()" style="border-radius: 9999px; padding: 9px 18px; font-size: 13px; font-weight: 600;">
          Export GST CSV
        </button>
      </div>
    </div>

    <!-- Top Bento Summary -->
    <div class="inv-bento-row">
      <div class="inv-hero-card">
        <div class="inv-hero-label">GST collected · ${escapeHtml(tenantName)}</div>
        <div class="inv-hero-value">${formatInr(totalTaxMinor)}</div>
        <div class="inv-hero-sub">
          on ${formatInr(totalSalesMinor)} taxable sales · ${invoices.length} invoice${invoices.length === 1 ? '' : 's'} (CGST 2.5% + SGST 2.5%)
        </div>
      </div>

      <div class="inv-attention-card">
        <div class="inv-att-label">Needs your attention</div>
        <div class="inv-att-count">${pendingOrders.length}</div>
        <div class="inv-att-sub">
          ${pendingOrders.length === 0
            ? 'All settled non-test orders have statutory GST invoices issued.'
            : `Settled order${pendingOrders.length === 1 ? '' : 's'} waiting for GST invoice generation.`}
        </div>
        ${pendingOrders.length > 0 ? `
          <button type="button" class="inv-att-link" onclick="generateInvoiceForOrder('${escapeHtml(pendingOrders[0].orderId)}')">
            Generate next invoice →
          </button>
        ` : `<a href="/whitelabel" class="inv-att-link" style="text-decoration: none;">Review GSTIN settings →</a>`}
      </div>
    </div>

    <!-- Pending Settlement Orders Strip (only shown when > 0) -->
    ${pendingOrders.length > 0 ? `
      <div class="ui-card inv-list-card" style="margin-bottom: 4px;">
        <div class="inv-list-header">
          <h2 class="inv-list-title">Awaiting GST Invoice (${pendingOrders.length})</h2>
        </div>
        <div class="inv-rows">
          ${pendingOrders.slice(0, 6).map((ord) => `
            <div class="inv-row inv-row-warn">
              <div class="inv-row-left">
                <div class="inv-row-icon warn">🧾</div>
                <div>
                  <div class="inv-row-num">${escapeHtml((ord as any).displayId || ord.orderId)}</div>
                  <div class="inv-row-meta">${escapeHtml(ord.tableNumber || 'Counter')} · ${escapeHtml(String(ord.status))}</div>
                </div>
              </div>
              <div class="inv-row-right">
                <div class="inv-row-amt">${formatInr((ord as any).quote?.totalMinor || (ord as any).totalMinor || 0)}</div>
                <button type="button" class="btn btn-primary" onclick="generateInvoiceForOrder('${escapeHtml(ord.orderId)}')" style="border-radius: 9999px; padding: 6px 14px; font-size: 12px; font-weight: 600;">
                  Generate GST Invoice
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Recent Invoices Card -->
    <div class="ui-card inv-list-card">
      <div class="inv-list-header">
        <h2 class="inv-list-title">Recent invoices</h2>
        <input
          type="text"
          id="invoice-search-input"
          placeholder="Search invoice no. or order..."
          oninput="filterInvoices(this.value)"
          class="inv-search-input"
        />
      </div>

      <div class="inv-rows" id="invoices-list-body">
        ${invoices.length === 0 ? `
          <div class="inv-empty">
            No statutory GST invoices generated yet for <strong>${escapeHtml(tenantName)}</strong>.
            Complete an order via POS or Orders workspace and click <strong>Generate GST Invoice</strong>.
          </div>
        ` : invoices.map((inv) => {
          const typeLabel = inv.invoiceType === 'BILL_OF_SUPPLY' ? 'Bill of Supply' : inv.invoiceType === 'RECEIPT' ? 'Receipt' : 'Paid';
          const badgeClass = inv.invoiceType === 'TAX_INVOICE' || !inv.invoiceType ? 'badge-paid' : 'badge-neutral';
          return `
            <div
              class="inv-row invoice-item-row"
              data-search="${escapeHtml(`${inv.invoiceNumber} ${inv.orderId} ${inv.gstin || ''}`.toLowerCase())}"
            >
              <div class="inv-row-left">
                <div class="inv-row-icon">📄</div>
                <div>
                  <div class="inv-row-title-line">
                    <span class="inv-row-num">${escapeHtml(inv.invoiceNumber)}</span>
                    <span class="inv-badge ${badgeClass}">${typeLabel}</span>
                  </div>
                  <div class="inv-row-meta">
                    Order ${escapeHtml(inv.orderId.slice(0, 14))} · FY ${escapeHtml(inv.fiscalYear)} · Taxable ${formatInr(inv.subtotalMinor)}
                  </div>
                </div>
              </div>
              <div class="inv-row-right">
                <div style="text-align: right;">
                  <div class="inv-row-amt">${formatInr(inv.totalMinor)}</div>
                  <div class="inv-row-gst">GST ${formatInr(inv.taxMinor)}</div>
                </div>
                <a
                  href="/api/restaurant/invoices/${encodeURIComponent(inv.invoiceNumber)}/print"
                  target="_blank"
                  rel="noopener"
                  class="btn btn-secondary"
                  style="border-radius: 9999px; padding: 6px 14px; font-size: 12px; font-weight: 600; text-decoration: none;"
                >
                  Print
                </a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  </div>

  <style>
    .inv-page {
      padding: 24px 32px 64px 32px;
      max-width: 1320px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .inv-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 12px;
    }
    .inv-eyebrow {
      font-size: 13px;
      font-weight: 500;
      color: #64748B;
      margin-bottom: 4px;
    }
    .inv-title {
      font-size: 34px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: -0.025em;
      margin: 0;
    }
    .inv-bento-row {
      display: grid;
      grid-template-columns: 1.8fr 1fr;
      gap: 20px;
    }
    .inv-hero-card {
      background: #111319;
      color: #FFFFFF;
      border-radius: 28px;
      padding: 28px 32px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 164px;
    }
    .inv-hero-label {
      font-size: 13px;
      color: #94A3B8;
      font-weight: 500;
    }
    .inv-hero-value {
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -0.03em;
      margin: 8px 0;
      font-variant-numeric: tabular-nums;
    }
    .inv-hero-sub {
      font-size: 13px;
      color: #94A3B8;
    }
    .inv-attention-card {
      background: #FFFFFF;
      border: 1px solid rgba(15, 23, 42, 0.06);
      border-radius: 28px;
      padding: 26px 28px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 8px;
    }
    .inv-att-label {
      font-size: 13px;
      color: #64748B;
      font-weight: 500;
    }
    .inv-att-count {
      font-size: 34px;
      font-weight: 800;
      color: #0F172A;
      font-variant-numeric: tabular-nums;
    }
    .inv-att-sub {
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }
    .inv-att-link {
      background: none;
      border: none;
      padding: 0;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #2563EB;
      cursor: pointer;
      margin-top: 4px;
    }
    .inv-list-card {
      padding: 24px 28px;
      border-radius: 28px;
    }
    .inv-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 18px;
    }
    .inv-list-title {
      font-size: 17px;
      font-weight: 700;
      color: #0F172A;
      margin: 0;
    }
    .inv-search-input {
      background: #F1F5F9;
      border: 1px solid transparent;
      border-radius: 9999px;
      padding: 8px 16px;
      font-size: 13px;
      color: #0F172A;
      width: 240px;
      max-width: 100%;
      outline: none;
    }
    .inv-search-input:focus {
      background: #FFFFFF;
      border-color: #CBD5E1;
    }
    .inv-rows {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .inv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 1px solid #F1F5F9;
      transition: background 120ms ease;
    }
    .inv-row:hover {
      background: #F8FAFC;
    }
    .inv-row-warn {
      background: #FFFBEB;
      border-color: #FEF3C7;
    }
    .inv-row-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }
    .inv-row-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .inv-row-icon.warn {
      background: #FEF3C7;
    }
    .inv-row-title-line {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .inv-row-num {
      font-size: 14px;
      font-weight: 700;
      color: #0F172A;
    }
    .inv-row-meta {
      font-size: 12px;
      color: #64748B;
      margin-top: 2px;
    }
    .inv-row-right {
      display: flex;
      align-items: center;
      gap: 16px;
      flex-shrink: 0;
    }
    .inv-row-amt {
      font-size: 15px;
      font-weight: 700;
      color: #0F172A;
      font-variant-numeric: tabular-nums;
    }
    .inv-row-gst {
      font-size: 11px;
      color: #64748B;
    }
    .inv-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 9px;
      border-radius: 9999px;
    }
    .inv-badge.badge-paid {
      background: #DCFCE7;
      color: #166534;
    }
    .inv-badge.badge-neutral {
      background: #DBEAFE;
      color: #1E40AF;
    }
    .inv-empty {
      padding: 40px 16px;
      text-align: center;
      color: #64748B;
      font-size: 13px;
      line-height: 1.6;
    }
    @media (max-width: 820px) {
      .inv-page {
        padding: 16px 16px 88px 16px;
      }
      .inv-bento-row {
        grid-template-columns: 1fr;
      }
      .inv-row {
        flex-direction: column;
        align-items: flex-start;
      }
      .inv-row-right {
        width: 100%;
        justify-content: space-between;
      }
    }
  </style>

  <script>
    const INVOICES_DATA = ${JSON.stringify(
      invoices.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        orderId: i.orderId,
        fiscalYear: i.fiscalYear,
        gstin: i.gstin || '',
        subtotalMinor: i.subtotalMinor,
        taxMinor: i.taxMinor,
        totalMinor: i.totalMinor,
        type: i.invoiceType || 'TAX_INVOICE',
      }))
    )};

    function filterInvoices(query) {
      const q = String(query || '').toLowerCase().trim();
      document.querySelectorAll('.invoice-item-row').forEach((row) => {
        const hay = row.getAttribute('data-search') || '';
        row.style.display = !q || hay.includes(q) ? 'flex' : 'none';
      });
    }

    async function generateInvoiceForOrder(orderId) {
      try {
        const res = await window.apiFetch('/api/restaurant/invoices/generate', {
          method: 'POST',
          body: { orderId }
        });
        window.showToast('Invoice ' + (res.data?.invoiceNumber || '') + ' generated successfully.', 'success');
        setTimeout(() => window.location.reload(), 600);
      } catch (err) {
        window.showToast((err && err.message) || 'Could not generate GST invoice.', 'error');
      }
    }

    function exportInvoicesCsv() {
      const header = 'Invoice Number,Order ID,Fiscal Year,GSTIN,Type,Taxable (INR),GST (INR),Total (INR)\\n';
      const rows = INVOICES_DATA.map((i) =>
        [
          i.invoiceNumber,
          i.orderId,
          i.fiscalYear,
          i.gstin,
          i.type,
          (i.subtotalMinor / 100).toFixed(2),
          (i.taxMinor / 100).toFixed(2),
          (i.totalMinor / 100).toFixed(2),
        ]
          .map((v) => '"' + String(v || '').replace(/"/g, '""') + '"')
          .join(',')
      ).join('\\n');
      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'restaurant-gst-invoices.csv';
      a.click();
      URL.revokeObjectURL(url);
      if (window.showToast) window.showToast('Exported ' + INVOICES_DATA.length + ' invoices to CSV.', 'success');
    }
  </script>
  `;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
