import { PaginationQuery, PaginationMeta, PaginatedResult } from '@orbitox/types';

/**
 * Normalizes pagination parameters with safe defaults
 */
export function normalizePagination(query: Partial<PaginationQuery>): Required<Pick<PaginationQuery, 'page' | 'limit'>> & Partial<PaginationQuery> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20)); // Rule B3: Default 20, Max 100

  return {
    ...query,
    page,
    limit,
  };
}

/**
 * Calculates pagination metadata from raw DB results
 */
export function buildPaginationMeta(
  totalItems: number,
  page: number,
  limit: number,
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / limit);

  return {
    page,
    limit,
    total: totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Helper to construct a standard paginated response
 */
export function createPaginatedResult<T>(
  items: T[],
  total: number,
  query: PaginationQuery,
): PaginatedResult<T> & { meta: PaginationMeta } {
  const normalized = normalizePagination(query);
  return {
    items,
    total,
    meta: buildPaginationMeta(total, normalized.page, normalized.limit),
  };
}
