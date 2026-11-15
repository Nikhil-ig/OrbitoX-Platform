import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { platformRepository } from '@/server/db/platform-repository';
import { provisioningService } from '@/server/provisioning/provisioning-service';
import { ConsoleShell } from '../components/console-shell';
import { ProvisioningClient } from './provisioning-client';

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

  const statusParam = typeof searchParams.status === 'string' ? searchParams.status : 'ALL';
  const tenantParam = typeof searchParams.tenant === 'string' ? searchParams.tenant : '';
  const initialOpenWizard = searchParams.action === 'new';

  // Parallel data loading
  const [summary, operations, orgs] = await Promise.all([
    provisioningService.getSummary(),
    provisioningService.listOperations({
      status: statusParam !== 'ALL' ? statusParam : undefined,
      query: tenantParam || undefined,
    }),
    platformRepository.listOrganizations().catch(() => []),
  ]);

  const availableOrganizations = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
  }));

  return (
    <ConsoleShell activeId="provisioning" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ProvisioningClient
        initialSummary={summary}
        initialOperations={operations}
        availableOrganizations={availableOrganizations}
        initialStatusFilter={statusParam}
        initialTenantParam={tenantParam}
        initialOpenWizard={initialOpenWizard}
      />
    </ConsoleShell>
  );
}
