import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { organizationService } from '@/server/organizations/organization-service';
import { ConsoleShell } from '../components/console-shell';
import { OrganizationsClient } from './organizations-client';

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

  const orgParam =
    typeof searchParams.org === 'string'
      ? searchParams.org
      : typeof searchParams.id === 'string'
      ? searchParams.id
      : '';
  const statusParam = typeof searchParams.status === 'string' ? searchParams.status : 'ALL';
  const tierParam = typeof searchParams.tier === 'string' ? searchParams.tier : 'ALL';

  // Parallel data loading
  const [summary, organizations, selectedOrgDetail] = await Promise.all([
    organizationService.getSummary(),
    organizationService.listOrganizations({
      status: statusParam,
      tier: tierParam,
    }),
    orgParam ? organizationService.getOrganization(orgParam).catch(() => null) : Promise.resolve(null),
  ]);

  return (
    <ConsoleShell activeId="orgs" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <OrganizationsClient
        initialSummary={summary}
        initialOrganizations={organizations}
        initialSelectedOrgDetail={selectedOrgDetail}
        initialOrgParam={orgParam}
        initialStatusFilter={statusParam}
        initialTierFilter={tierParam}
      />
    </ConsoleShell>
  );
}
