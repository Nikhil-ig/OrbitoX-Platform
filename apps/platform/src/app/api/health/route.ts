import { createHealthHandler } from '@/server/http/health-route-handler';

/** Liveness probe for Docker / load balancers. Public, minimal, no internals. */
export const dynamic = 'force-dynamic';

export const GET = createHealthHandler();
