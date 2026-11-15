import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { dataRightsConsoleService } from '@/server/data-rights/data-rights-console-service';
import { ConsoleShell } from '../components/console-shell';
import { DataRightsClient } from './data-rights-client';

export const metadata = {
  title: 'Data Rights & Privacy · OrbitoX Operator Console',
  description: 'Data Subject Requests (DSR), automated cryptographic erasure, personal data exports, and consent audits.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleDataRightsPage(props: {
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

  const kindParam = typeof searchParams.kind === 'string' ? searchParams.kind : 'all';
  const searchParam = typeof searchParams.search === 'string' ? searchParams.search : '';

  // Parallel data loading
  const [summary, requests] = await Promise.all([
    dataRightsConsoleService.getSummary(),
    dataRightsConsoleService.listRequests({ kind: kindParam, search: searchParam }),
  ]);

  return (
    <ConsoleShell activeId="data-rights" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <DataRightsClient
        initialSummary={summary}
        initialRequests={requests}
        initialKindFilter={kindParam}
        initialSearch={searchParam}
      />
    </ConsoleShell>
  );
}
