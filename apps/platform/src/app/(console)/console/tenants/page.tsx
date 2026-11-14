import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getOperatorSession, OPERATOR_SESSION_COOKIE } from '@/server/accounts/account-service';
import { ConsoleShell } from '../components/console-shell';
import { listTenants } from '@/server/tenants/tenants-service';
import { TenantsIndexClient } from './tenants-index-client';

export const dynamic = 'force-dynamic';

export default async function ConsoleTenantsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(OPERATOR_SESSION_COOKIE)?.value;
  const operator = await getOperatorSession(sessionToken);

  if (!operator) {
    redirect('/platform/login?next=/console/tenants');
  }

  const initialData = await listTenants({}, operator);

  return (
    <ConsoleShell activeId="tenants" operatorEmail={operator.email} operatorRole={operator.role}>
      <TenantsIndexClient initialData={initialData} />
    </ConsoleShell>
  );
}
