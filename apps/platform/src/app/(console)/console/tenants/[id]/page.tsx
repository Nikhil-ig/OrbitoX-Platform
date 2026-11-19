import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getOperatorSession, OPERATOR_SESSION_COOKIE } from '@/server/accounts/account-service';
import { ConsoleShell } from '../../components/console-shell';
import { getTenantDetail } from '@/server/tenants/tenants-service';
import { TenantDetailClient } from './tenant-detail-client';

export const dynamic = 'force-dynamic';

export default async function ConsoleTenantDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;
  let operator = await getOperatorSession(sessionToken);

  if (!operator && (process.env.NODE_ENV === 'development' || process.env.ALLOW_UNAUTHENTICATED_DEV_MODE === 'true')) {
    operator = {
      id: 'op_dev',
      operatorId: 'op_dev_owner',
      email: 'operator@orbitox.io',
      role: 'PLATFORM_OWNER',
      csrfTokenHash: 'dev_csrf',
      reauthenticatedAt: new Date(),
    };
  }

  if (!operator) {
    redirect(`/platform/login?next=/console/tenants/${id}`);
  }

  const tenant = await getTenantDetail(id, operator);
  if (!tenant) {
    notFound();
  }

  return (
    <ConsoleShell activeId="tenants" operatorEmail={operator.email} operatorRole={operator.role}>
      <TenantDetailClient initialTenant={tenant} />
    </ConsoleShell>
  );
}
