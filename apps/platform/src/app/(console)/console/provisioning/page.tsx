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
  title: 'Provisioning Operations · OrbitoX Operator Console',
  description: 'Asynchronous database cell creation, cryptographic key generation, and service bootstrap orchestrations.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleProvisioningPage(props: {
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
    <ConsoleShell activeId="provisioning" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ConsolePlaceholder
        title="Provisioning Operations"
        stageBadge="Stage C4"
        stageName="Stage C4 — Saga Engine & Asynchronous Operations"
        description="Asynchronous database cell creation, cryptographic key generation, and service bootstrap orchestrations."
        detailedNotes="The Saga provisioning engine coordinates distributed infrastructure mutations across AWS RDS PostgreSQL databases, Cloudflare custom hostnames, and cryptographic signing keypairs. Jobs execute asynchronously with comprehensive compensating rollback handlers. Live operational control will be connected in Stage C4."
        searchParams={searchParams}
        actionType="retry-provisioning"
      />
    </ConsoleShell>
  );
}

