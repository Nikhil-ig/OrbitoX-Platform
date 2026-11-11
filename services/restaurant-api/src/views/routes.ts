import type { TenantRouteContext } from '../http/types';
import { handleOperationsViews } from './operations';
import { handleDinerViews } from './diner-kds';

export async function handleLegacyUiRoutes(ctx: TenantRouteContext): Promise<boolean> {
  if (await handleOperationsViews(ctx)) return true;
  if (await handleDinerViews(ctx)) return true;
  return false;
}
