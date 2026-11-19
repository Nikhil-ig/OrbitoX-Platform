/**
 * OrbitoX Universal Database Adapter Interface
 * ─────────────────────────────────────────────────────────────
 * Allows connecting ANY database engine (PostgreSQL, MySQL, MongoDB,
 * SQLite, DynamoDB, Supabase, Neon, Turso) or ORM (Prisma, Drizzle,
 * Mongoose, TypeORM, Kysely, Knex) to the OrbitoX platform.
 */

export interface DatabaseQueryOptions {
  filter?: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: string;
  contextId?: string;
  allowedContextIds?: string[];
}

export interface DatabaseQueryResult<T = any> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
    sort?: string;
    filters?: Record<string, any>;
  };
}

export interface OrbitoXDatabaseAdapter {
  name: string;
  
  /**
   * Find multiple entity records matching query and context filters
   */
  findMany<T = any>(entity: string, options?: DatabaseQueryOptions): Promise<DatabaseQueryResult<T>>;

  /**
   * Find a single record by ID within a context
   */
  findById<T = any>(entity: string, id: string, contextId?: string): Promise<T | null>;

  /**
   * Create a new record with automatic context tagging
   */
  create<T = any>(entity: string, data: Partial<T>, contextId?: string): Promise<T>;

  /**
   * Update an existing record by ID
   */
  update<T = any>(entity: string, id: string, data: Partial<T>, contextId?: string): Promise<T>;

  /**
   * Delete a record by ID
   */
  delete(entity: string, id: string, contextId?: string): Promise<boolean>;

  /**
   * Optional health check method
   */
  ping?(): Promise<boolean>;
}
