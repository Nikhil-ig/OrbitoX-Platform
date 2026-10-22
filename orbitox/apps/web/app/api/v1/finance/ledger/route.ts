import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard } from '../../_lib/api-guard';

const LEDGER_ENTRIES = [
  {
    journalId: 'JRN-202609-001',
    timestamp: '2026-09-09T08:14:22Z',
    type: 'CREDIT',
    account: '1010-Cash-And-Escrow',
    counterAccount: '4000-Merchant-Revenue',
    amount: 14850.0,
    currency: 'USD',
    reference: 'OmniDeliver Dispatch Batch #8819',
    digitalSignature: 'ed25519:7b91...88c2',
    reconciled: true,
  },
  {
    journalId: 'JRN-202609-002',
    timestamp: '2026-09-09T08:45:10Z',
    type: 'DEBIT',
    account: '2010-Vendor-Payout-Payables',
    counterAccount: '1010-Cash-And-Escrow',
    amount: 9400.0,
    currency: 'USD',
    reference: 'Automated ACH Vendor Settlement',
    digitalSignature: 'ed25519:12fa...44d9',
    reconciled: true,
  },
  {
    journalId: 'JRN-202609-003',
    timestamp: '2026-09-09T09:12:00Z',
    type: 'CREDIT',
    account: '1020-Stripe-Settlement-Float',
    counterAccount: '4010-Direct-Store-Sales',
    amount: 3240.0,
    currency: 'USD',
    reference: 'Aura Luxury Boutique Checkout #ORD-9821',
    digitalSignature: 'ed25519:90fe...11ea',
    reconciled: true,
  },
];

export const GET = withApiGuard(
  {
    serviceId: 'finance',
    serviceName: 'Finance & Ledger Engine',
  },
  async (req: NextRequest) => {
    return NextResponse.json({
      success: true,
      data: LEDGER_ENTRIES,
      meta: {
        totalEntries: LEDGER_ENTRIES.length,
        ledgerStatus: 'balanced_immutable',
        auditEngine: 'Ed25519-Signed-Audit-Ledger',
      },
    });
  }
);
