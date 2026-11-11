import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildGSTInvoice,
  renderPrintableInvoiceHtml,
  SAC_RESTAURANT_SERVICES,
} from '../src/shared/invoicing';

const SAMPLE_ORDER = {
  orderId: 'ord_test_101',
  tableNumber: 'T-4',
  items: [
    { id: 'item_1', name: 'Dal Makhani', unitPriceMinor: 35000, quantity: 2 },
    { id: 'item_2', name: 'Garlic Naan', unitPriceMinor: 8000, quantity: 4 },
  ],
  currency: 'INR',
};

describe('Phase 6F B0-11: GSTIN Isolation, Fallback Elimination & Statutory Invoicing', () => {
  it('1. Tenant without a GSTIN refuses tax invoice issuance with GSTIN_REQUIRED error', () => {
    // Missing brand and missing explicit GSTIN (default unregistered mode is refuse)
    assert.throws(
      () => {
        buildGSTInvoice({
          order: SAMPLE_ORDER,
          sequenceNumber: 1,
          tenantId: 'tenant_no_gstin',
          tenantBrand: {
            restaurantName: 'No GSTIN Diner',
            address: '100 Food Court, Bandra',
          },
        });
      },
      (err: any) => {
        assert.equal(err.code, 'GSTIN_REQUIRED');
        assert.match(err.message, /GSTIN is required to issue a tax invoice/);
        return true;
      }
    );
  });

  it('2. Tenant with malformed or invalid GSTIN format throws GSTIN_REQUIRED', () => {
    const invalidGstins = [
      'NOT_A_GSTIN',
      '27INVALID123',
      '27AAPFU0939F1Z', // 14 chars
      '27AAPFU0939F1ZVV', // 16 chars
      '27AAPFU0939F19V', // 14th char not Z
    ];

    for (const badGstin of invalidGstins) {
      assert.throws(
        () => {
          buildGSTInvoice({
            order: SAMPLE_ORDER,
            sequenceNumber: 1,
            tenantId: 'tenant_bad_gstin',
            tenantBrand: {
              gstin: badGstin,
              restaurantName: 'Bad GSTIN Cafe',
              address: '50 Main Road',
            },
          });
        },
        (err: any) => {
          assert.equal(err.code, 'GSTIN_REQUIRED');
          assert.match(err.message, /Invalid Indian GSTIN format/);
          return true;
        }
      );
    }
  });

  it('3. Unregistered tenant with unregisteredInvoiceMode = "bill_of_supply" issues statutory Bill of Supply (0% tax)', () => {
    const invoice = buildGSTInvoice({
      order: SAMPLE_ORDER,
      sequenceNumber: 2,
      tenantId: 'tenant_composition_vendor',
      unregisteredInvoiceMode: 'bill_of_supply',
      tenantBrand: {
        restaurantName: 'Small Corner Cafe',
        address: 'Shop 12, Station Road, Pune',
      },
    });

    assert.equal(invoice.invoiceType, 'BILL_OF_SUPPLY');
    assert.equal(invoice.subtotalMinor, 102000); // 70000 + 32000
    assert.equal(invoice.taxMinor, 0); // Exempt / composite
    assert.equal(invoice.totalMinor, 102000);
    assert.equal(invoice.taxBreakdown.cgstMinor, 0);
    assert.equal(invoice.taxBreakdown.sgstMinor, 0);

    // Verify HTML rendering for Bill of Supply
    const html = renderPrintableInvoiceHtml(invoice);
    assert.match(html, /BILL OF SUPPLY/);
    assert.match(html, /Composition taxable person \/ Unregistered establishment/);
  });

  it('4. Unregistered tenant with unregisteredInvoiceMode = "receipt" issues standard Commercial Receipt (0% tax)', () => {
    const invoice = buildGSTInvoice({
      order: SAMPLE_ORDER,
      sequenceNumber: 3,
      tenantId: 'tenant_unregistered_kiosk',
      unregisteredInvoiceMode: 'receipt',
      tenantBrand: {
        restaurantName: 'Street Kiosk',
        address: 'Metro Gate 2, Bengaluru',
      },
    });

    assert.equal(invoice.invoiceType, 'RECEIPT');
    assert.equal(invoice.taxMinor, 0);
    assert.equal(invoice.totalMinor, 102000);

    const html = renderPrintableInvoiceHtml(invoice);
    assert.match(html, /COMMERCIAL RECEIPT/);
    assert.match(html, /Standard Commercial Receipt — not a tax invoice/);
  });

  it('5. Two tenants with different GSTINs: each invoice strictly carries its own taxpayer identity and address', () => {
    const tenantA_GSTIN = '27AAAAA0000A1Z5'; // Maharashtra
    const tenantB_GSTIN = '29BBBBB1111B1Z2'; // Karnataka

    const invoiceA = buildGSTInvoice({
      order: {
        orderId: 'ord_tenant_a_1',
        items: [{ id: 'a1', name: 'Mumbai Vada Pav', unitPriceMinor: 5000, quantity: 2 }],
      },
      sequenceNumber: 10,
      tenantId: 'tenant_mumbai_spice',
      tenantBrand: {
        gstin: tenantA_GSTIN,
        restaurantName: 'Mumbai Spice Ltd',
        legalEntityName: 'Mumbai Spice Hospitality Pvt Ltd',
        address: 'Bandra West, Mumbai 400050',
      },
    });

    const invoiceB = buildGSTInvoice({
      order: {
        orderId: 'ord_tenant_b_1',
        items: [{ id: 'b1', name: 'Bangalore Dosa', unitPriceMinor: 8000, quantity: 2 }],
      },
      sequenceNumber: 20,
      tenantId: 'tenant_bangalore_tiffin',
      tenantBrand: {
        gstin: tenantB_GSTIN,
        restaurantName: 'Bangalore Tiffin House',
        legalEntityName: 'Southern Tiffin Enterprises LLP',
        address: 'Indiranagar, Bengaluru 560038',
      },
    });

    // Tenant A isolation check
    assert.equal(invoiceA.invoiceType, 'TAX_INVOICE');
    assert.equal(invoiceA.gstin, tenantA_GSTIN);
    assert.equal(invoiceA.restaurantName, 'Mumbai Spice Ltd');
    assert.equal(invoiceA.legalEntityName, 'Mumbai Spice Hospitality Pvt Ltd');
    assert.equal(invoiceA.address, 'Bandra West, Mumbai 400050');
    assert.notEqual(invoiceA.gstin, invoiceB.gstin);

    // Tenant B isolation check
    assert.equal(invoiceB.invoiceType, 'TAX_INVOICE');
    assert.equal(invoiceB.gstin, tenantB_GSTIN);
    assert.equal(invoiceB.restaurantName, 'Bangalore Tiffin House');
    assert.equal(invoiceB.legalEntityName, 'Southern Tiffin Enterprises LLP');
    assert.equal(invoiceB.address, 'Indiranagar, Bengaluru 560038');

    // Tax calculation check (5% GST split: 2.5% CGST + 2.5% SGST)
    assert.equal(invoiceA.subtotalMinor, 10000);
    assert.equal(invoiceA.taxMinor, 500); // 5%
    assert.equal(invoiceA.totalMinor, 10500);
    assert.equal(invoiceA.taxBreakdown.cgstMinor, 250);
    assert.equal(invoiceA.taxBreakdown.sgstMinor, 250);

    // Render HTML check
    const htmlA = renderPrintableInvoiceHtml(invoiceA);
    assert.match(htmlA, new RegExp(tenantA_GSTIN));
    assert.doesNotMatch(htmlA, new RegExp(tenantB_GSTIN));

    const htmlB = renderPrintableInvoiceHtml(invoiceB);
    assert.match(htmlB, new RegExp(tenantB_GSTIN));
    assert.doesNotMatch(htmlB, new RegExp(tenantA_GSTIN));
  });

  it('6. renderPrintableInvoiceHtml enforces GSTIN_REQUIRED when tax invoice lacks valid GSTIN and has no hardcoded fallbacks', () => {
    // Attempting to render TAX_INVOICE without a valid GSTIN throws GSTIN_REQUIRED
    const mockRecord: any = {
      orderId: 'ord_x',
      invoiceNumber: 'INV-202627-000001',
      invoiceType: 'TAX_INVOICE',
      subtotalMinor: 50000,
      taxMinor: 2500,
      totalMinor: 52500,
      itemBreakdown: [],
    };

    assert.throws(
      () => renderPrintableInvoiceHtml(mockRecord),
      /GSTIN is required to render tax invoice/
    );

    // With valid GSTIN and tenant brand, renders correctly without any fallback strings
    mockRecord.gstin = '07AAAAA0000A1Z5';
    const html = renderPrintableInvoiceHtml(mockRecord, {
      restaurantName: 'Acme Dining',
      address: 'Connaught Place, Delhi',
    });

    assert.match(html, /TAX INVOICE/);
    assert.match(html, /Acme Dining/);
    assert.match(html, /07AAAAA0000A1Z5/);
    assert.doesNotMatch(html, /Main Promenade, Sector 14/);
  });

  it('7. Grep check: sample pilot GSTIN string (27AAPFU0939F1ZV) appears nowhere outside test directories', () => {
    const targetLiteral = '27AAPFU0939F1ZV';
    const repoRoot = path.resolve(__dirname, '../../..');

    function scanDir(dir: string): string[] {
      const violations: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(repoRoot, fullPath);

        // Skip ignored directories and test files/fixtures
        if (
          entry.name === 'node_modules' ||
          entry.name === '.git' ||
          entry.name === 'dist' ||
          entry.name === 'build' ||
          entry.name === '.gemini' ||
          entry.name === '.agents' ||
          entry.name.endsWith('.log') ||
          entry.name.endsWith('.png') ||
          entry.name.endsWith('.zip')
        ) {
          continue;
        }

        // Allow test files and test scripts to contain fixtures
        const isTestPath =
          relPath.includes('/test/') ||
          relPath.includes('/tests/') ||
          relPath.includes('/__tests__/') ||
          relPath.includes('test-') ||
          relPath.startsWith('scripts/test-');

        if (entry.isDirectory()) {
          violations.push(...scanDir(fullPath));
        } else if (entry.isFile() && !isTestPath) {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (content.includes(targetLiteral)) {
            violations.push(relPath);
          }
        }
      }

      return violations;
    }

    const violations = scanDir(repoRoot);
    assert.deepEqual(
      violations,
      [],
      `Found forbidden literal ${targetLiteral} in non-test files: ${violations.join(', ')}`
    );
  });
});
