/**
 * Multi-Tier Cache Namespace Isolation Utility
 * Formats Redis/Cache keys into strict tier-isolated namespaces:
 * context:{contextId}:{entity}:{key}
 */
export function buildCacheKey(contextId: string, key: string, entity?: string): string {
  const safeContextId = contextId || 'global';
  const prefix = entity ? `context:${safeContextId}:${entity}` : `context:${safeContextId}`;
  return `${prefix}:${key}`;
}
