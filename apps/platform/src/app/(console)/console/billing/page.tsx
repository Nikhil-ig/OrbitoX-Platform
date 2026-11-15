import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { ConsoleShell } from '../components/console-shell';
import { getBillingSummary, listBillingInvoices } from '@/server/billing/billing-service';
import { BillingClient } from './billing-client';

export const metadata = {
  title: 'Billing & Subscriptions · OrbitoX Operator Console',
  description: 'Subscription tier management, quota enforcement, billing invoices, and automated payment recovery.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleBillingPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const cookieStore = await cookies();
  const operatorToken = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;

  let session: OperatorSessionContext | null = null;
  if (operatorToken) {
    try {
      session = await getOperatorSession(operatorToken);
    } catch {
      // Allow nominal operator context in development
    }
  }

  const operatorEmail = session?.email || 'operator@orbitox.io';
  const operatorRole = session?.role || 'PLATFORM_OWNER';

  const [summary, invoices] = await Promise.all([
    getBillingSummary(session),
    listBillingInvoices(
      {
        search: typeof searchParams.search === 'string' ? searchParams.search : undefined,
        status: typeof searchParams.status === 'string' ? searchParams.status : undefined,
      },
      session
    ),
  ]);

  return (
    <ConsoleShell activeId="billing" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <BillingClient
        initialSummary={summary}
        initialInvoices={invoices}
        operatorEmail={operatorEmail}
        operatorRole={operatorRole}
      />
    </ConsoleShell>
  );
}
