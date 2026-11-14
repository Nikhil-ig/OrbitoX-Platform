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
  title: 'Audit Log · OrbitoX Operator Console',
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

  return (
    <ConsoleShell activeId="audit" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ConsolePlaceholder
        title="Platform Audit Log"
        stageBadge="Owner Sign-off Needed"
        stageName="Operator Audit Log — Screen Pending Owner Decision"
        description="Append-only, cryptographically verified audit records for administrative platform operations."
        detailedNotes="Flagged for owner decision: A standalone audit log screen was not included in the original 44 concept screens list. This route serves as a verified placeholder until the owner decides whether to introduce a dedicated audit inspection screen (C-series) or fold platform audit trails directly into Security & Keys (C6)."
        searchParams={searchParams}
      />
    </ConsoleShell>
  );
}

