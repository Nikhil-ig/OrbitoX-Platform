import * as React from 'react';
import { cookies } from 'next/headers';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
  type OperatorSessionContext,
} from '@/server/accounts/account-service';
import { securityConsoleService } from '@/server/security/security-console-service';
import { ConsoleShell } from '../components/console-shell';
import { SecurityClient } from './security-client';

export const metadata = {
  title: 'Security & Keys · OrbitoX Operator Console',
  description: 'Cryptographic API keys, operator accounts, zero-trust session management, and lockout remediation.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleSecurityPage() {
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

  // Load security overview server-side
  const overview = await securityConsoleService.getOverview();

  return (
    <ConsoleShell activeId="security" operatorEmail={operatorEmail} operatorRole={operatorRole}>
      <SecurityClient initialOverview={overview} />
    </ConsoleShell>
  );
}
