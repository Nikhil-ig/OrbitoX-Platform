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

  return (
    <ConsoleShell activeId="data-rights" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ConsolePlaceholder
        title="Data Rights & Privacy"
        stageBadge="Stage C5"
        stageName="Stage C5 — GDPR & DPDP 2023 Compliance & Data Subject Rights"
        description="Data Subject Requests (DSR), automated cryptographic erasure, personal data exports, and consent audits."
        detailedNotes="Stage C5 provides zero-trust privacy orchestration supporting GDPR and India DPDP Act 2023 requirements. Operators can trigger and inspect verifiable cryptographic erasure workflows, download tamper-proof DSR exports, and verify tenant isolation compliance."
        searchParams={searchParams}
      />
    </ConsoleShell>
  );
}

