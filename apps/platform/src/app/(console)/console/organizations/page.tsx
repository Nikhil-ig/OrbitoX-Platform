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
  title: 'Organizations · OrbitoX Operator Console',
  description: 'Enterprise organization accounts, corporate hierarchy, and multi-tenant billing relationships.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleOrganizationsPage(props: {
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
    <ConsoleShell activeId="orgs" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ConsolePlaceholder
        title="Organizations"
        stageBadge="Stage C3"
        stageName="Stage C3 — Organization Hierarchy & Tenancy Management"
        description="Enterprise organization accounts, corporate hierarchy, and multi-tenant billing relationships."
        detailedNotes="Organizations represent top-level corporate accounts that encompass one or more multi-tenant runtime cells, brand franchises, or hospital clusters. Organization-level plan upgrades and multi-tenant billing rollups will be fully interactive upon completion of Stage C3. (C1 organization detail is represented in the fleet overview telemetry)."
        searchParams={searchParams}
        actionType="change-plan"
      />
    </ConsoleShell>
  );
}

