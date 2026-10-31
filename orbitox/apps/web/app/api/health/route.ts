import { createHealthHandler } from '../../../lib/health-route-handler';

/** Liveness probe for Docker / load balancers. Public, minimal, no internals. */
export const dynamic = 'force-dynamic';

export const GET = createHealthHandler();
