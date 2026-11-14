import * as React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  OPERATOR_SESSION_COOKIE,
  getOperatorSession,
} from '@/server/accounts/account-service';
import {
  getOverviewSummary,
  getOverviewTelemetry,
  getOverviewAlerts,
} from '@/server/overview/overview-service';
import { ConsoleShell } from '../components/console-shell';
import { OverviewClient } from './overview-client';

export const metadata = {
  title: 'Overview · OrbitoX Operator Console',
  description: 'Fleet-wide operations, telemetry, tenant health, and provisioning state.',
};

export const dynamic = 'force-dynamic';

export default async function ConsoleOverviewPage() {
  const cookieStore = await cookies();
  const operatorToken = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;

  let session = null;
  if (operatorToken) {
    try {
      session = await getOperatorSession(operatorToken);
    } catch {
      // In production, middleware gates unauthenticated requests
    }
  }

  // If running in development without a session, create nominal operator context
  const operatorEmail = session?.email || 'operator@orbitox.io';
  const operatorRole = session?.role || 'PLATFORM_OWNER';

  const [summary, telemetry, alerts] = await Promise.all([
    getOverviewSummary(session),
    getOverviewTelemetry(session),
    getOverviewAlerts(session),
  ]);

  return (
    <ConsoleShell
      activeId="overview"
      operatorEmail={operatorEmail}
      operatorRole={operatorRole}
    >
      <OverviewClient
        initialSummary={summary}
        initialTelemetry={telemetry}
        initialAlerts={alerts}
      />
    </ConsoleShell>
  );
}

