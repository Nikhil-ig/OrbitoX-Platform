import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { auditConsoleService } from '@/server/audit/audit-console-service';
import { ConsoleShell } from '../components/console-shell';
import { AuditClient } from './audit-client';

export const metadata = {
  title: 'Platform Audit Log · OrbitoX Operator Console',
  description: 'Append-only, cryptographically verified audit records for administrative platform operations.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleAuditPage(props: {
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

  // Read search/entity parameters from query URL
  const initialCategory = typeof searchParams.category === 'string' ? searchParams.category : 'ALL';
  const initialSearch = typeof searchParams.search === 'string' ? searchParams.search : '';
  const rawEntity = searchParams.entity || searchParams.entityId;
  const initialEntityId = typeof rawEntity === 'string' ? rawEntity : '';

  // Query audit overview from PostgreSQL
  const overview = await auditConsoleService.queryAuditLogs({
    category: initialCategory,
    search: initialSearch,
    entityId: initialEntityId,
    page: 1,
    pageSize: 25,
  });

  return (
    <ConsoleShell activeId="audit" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <AuditClient
        initialOverview={overview}
        initialCategory={initialCategory}
        initialSearch={initialSearch}
        initialEntityId={initialEntityId}
      />
    </ConsoleShell>
  );
}
