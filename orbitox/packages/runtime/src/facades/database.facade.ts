import { OrbitoXDatabaseAdapter, DatabaseQueryOptions, DatabaseQueryResult, MemoryDatabaseAdapter } from '../database';

/**
 * Database Facade
 * ─────────────────────────────────────────────────────────────
 * Provides a unified, ultra-simple database interface for the
 * entire OrbitoX runtime. Connects to in-memory, Prisma, Drizzle,
 * Mongoose, TypeORM, or any custom database adapter.
 * 
 * @example
 * // 1. Use default in-memory adapter
 * const patients = await orbitox.db.findMany('patient', { contextId: 'ctx_icu_a' });
 * 
 * // 2. Connect any database (e.g. Prisma / Postgres / Mongo)
 * orbitox.db.useAdapter(myPrismaAdapter);
 */
export class DatabaseFacade {
  private adapter: OrbitoXDatabaseAdapter = new MemoryDatabaseAdapter();

  /**
   * Plug in any database adapter (Prisma, Drizzle, Mongoose, TypeORM, custom).
   */
  useAdapter(adapter: OrbitoXDatabaseAdapter): this {
    this.adapter = adapter;
    return this;
  }

  /**
   * Get the currently active database adapter instance.
   */
  getAdapter(): OrbitoXDatabaseAdapter {
    return this.adapter;
  }

  /**
   * Find multiple entity records matching query and multi-tenant context filters.
   */
  async findMany<T = any>(entity: string, options: DatabaseQueryOptions = {}): Promise<DatabaseQueryResult<T>> {
    return this.adapter.findMany<T>(entity, options);
  }

  /**
   * Find a single record by ID within an isolated context.
   */
  async findById<T = any>(entity: string, id: string, contextId?: string): Promise<T | null> {
    return this.adapter.findById<T>(entity, id, contextId);
  }

  /**
   * Create a new entity record with automatic context tagging.
   */
  async create<T = any>(entity: string, data: Partial<T>, contextId?: string): Promise<T> {
    return this.adapter.create<T>(entity, data, contextId);
  }

  /**
   * Update an existing record by ID.
   */
  async update<T = any>(entity: string, id: string, data: Partial<T>, contextId?: string): Promise<T> {
    return this.adapter.update<T>(entity, id, data, contextId);
  }

  /**
   * Delete an entity record by ID.
   */
  async delete(entity: string, id: string, contextId?: string): Promise<boolean> {
    return this.adapter.delete(entity, id, contextId);
  }

  /**
   * Ping the active database connection.
   */
  async ping(): Promise<boolean> {
    if (this.adapter.ping) return this.adapter.ping();
    return true;
  }
}
