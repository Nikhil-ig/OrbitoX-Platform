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
  title: 'Security & Keys · OrbitoX Operator Console',
  description: 'Cryptographic key rotation, Ed25519 plugin signature verification, operator MFA, and zero-trust perimeter telemetry.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleSecurityPage(props: {
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
    <ConsoleShell activeId="security" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <ConsolePlaceholder
        title="Security & Keys"
        stageBadge="Stage C6"
        stageName="Stage C6 — KMS Keyrings, Ed25519 Signatures & WAF Telemetry"
        description="Cryptographic key rotation, Ed25519 plugin signature verification, operator MFA, and zero-trust perimeter telemetry."
        detailedNotes="Stage C6 introduces hardware-backed key rotation, digital signature enforcement for @orbitox-io plugins via CryptoSigner, tenant API token revocation, and real-time WAF telemetry for unauthorized boundary crossings."
        searchParams={searchParams}
      />
    </ConsoleShell>
  );
}

