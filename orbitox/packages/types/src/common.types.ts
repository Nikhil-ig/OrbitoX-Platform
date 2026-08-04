/**
 * @module @orbitox/types/common
 * Base interfaces shared across all entities in the platform.
 * Every table in OrbitoX extends these foundational shapes.
 */

/**
 * Standard timestamps for all entities.
 */
export interface Timestamped {
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Soft-delete marker. OrbitoX never hard-deletes business data (Rule A3).
 */
export interface SoftDeletable {
  deletedAt: Date | null;
  deletedBy: string | null;
}

/**
 * Audit trail marker. Every mutation produces an audit entry (Rule E1).
 */
export interface Auditable {
  createdBy: string;
  updatedBy: string;
}

/**
 * Base entity shape for all platform entities.
 * Includes UUID primary key, context scope, timestamps, and soft-delete.
 */
export interface BaseEntity extends Timestamped, SoftDeletable, Auditable {
  /** UUID v4 primary key */
  id: string;

  /** Context this entity belongs to — Rule A2: always present in every query */
  contextId: string;
}

/**
 * Standard sort direction for list queries.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Standard sort option for list queries.
 */
export interface SortOption {
  field: string;
  direction: SortDirection;
}

/**
 * Standard filter operator for dynamic queries.
 */
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notIn'
  | 'like'
  | 'ilike'
  | 'isNull'
  | 'isNotNull'
  | 'between';

/**
 * A single filter condition for dynamic queries.
 */
export interface FilterCondition {
  field: string;
  operator: FilterOperator;
  value: unknown;
}
