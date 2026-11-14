import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { ConsoleShell } from '../components/console-shell';
import { ConsolePlaceholder } from '../components/console-placeholder';

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
      // In development, middleware allows fallback
    }
  }

  const operatorEmail = session?.email || 'operator@orbitox.io';
  const operatorRole = session?.role || 'PLATFORM_OWNER';

  return (
    <ConsoleShell activeId="billing" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ConsolePlaceholder
        title="Billing & Subscriptions"
        stageBadge="Stage C3"
        stageName="Stage C3 — Stripe & Razorpay Subscriptions & Quota Enforcement"
        description="Subscription tier management, quota enforcement, billing invoices, and automated payment recovery."
        detailedNotes="Stage C3 connects the operator billing cockpit to real-time subscription lifecycle webhooks, recurring invoice generation, dynamic plan quota updates, and automated grace period suspensions for delinquent commercial accounts."
        searchParams={searchParams}
      />
    </ConsoleShell>
  );
}

