import { OrbitoXDatabaseAdapter, DatabaseQueryOptions, DatabaseQueryResult } from './types';

export interface GenericDatabaseHandler<T = any> {
  findMany?: (entity: string, options: DatabaseQueryOptions) => Promise<DatabaseQueryResult<T> | T[]>;
  findById?: (entity: string, id: string, contextId?: string) => Promise<T | null>;
  create?: (entity: string, data: Partial<T>, contextId?: string) => Promise<T>;
  update?: (entity: string, id: string, data: Partial<T>, contextId?: string) => Promise<T>;
  delete?: (entity: string, id: string, contextId?: string) => Promise<boolean>;
  ping?: () => Promise<boolean>;
}

/**
 * Generic Database Adapter Wrapper
 * ─────────────────────────────────────────────────────────────
 * Allows connecting Prisma, Drizzle, Mongoose, TypeORM, or custom SQL
 * by providing simple async handler functions.
 * 
 * @example
 * const prismaAdapter = createDatabaseAdapter('prisma', {
 *   findMany: async (entity, opts) => prisma[entity].findMany({ where: opts.filter }),
 *   create: async (entity, data, ctxId) => prisma[entity].create({ data: { ...data, contextId: ctxId } }),
 * });
 */
export class GenericDatabaseAdapter implements OrbitoXDatabaseAdapter {
  readonly name: string;
  private readonly handler: GenericDatabaseHandler;

  constructor(name: string, handler: GenericDatabaseHandler) {
    this.name = name;
    this.handler = handler;
  }

  async findMany<T = any>(entity: string, options: DatabaseQueryOptions = {}): Promise<DatabaseQueryResult<T>> {
    if (!this.handler.findMany) {
      return {
        data: [],
        meta: { page: options.page || 1, limit: options.limit || 20, total: 0 }
      };
    }
    const result = await this.handler.findMany(entity, options);
    if (Array.isArray(result)) {
      return {
        data: result as T[],
        meta: {
          page: options.page || 1,
          limit: options.limit || result.length,
          total: result.length,
          filters: options.filter
        }
      };
    }
    return result as DatabaseQueryResult<T>;
  }

  async findById<T = any>(entity: string, id: string, contextId?: string): Promise<T | null> {
    if (!this.handler.findById) return null;
    return this.handler.findById(entity, id, contextId);
  }

  async create<T = any>(entity: string, data: Partial<T>, contextId?: string): Promise<T> {
    if (!this.handler.create) {
      throw new Error(`Adapter '${this.name}' does not implement 'create' for entity '${entity}'`);
    }
    return this.handler.create(entity, data, contextId);
  }

  async update<T = any>(entity: string, id: string, data: Partial<T>, contextId?: string): Promise<T> {
    if (!this.handler.update) {
      throw new Error(`Adapter '${this.name}' does not implement 'update' for entity '${entity}'`);
    }
    return this.handler.update(entity, id, data, contextId);
  }

  async delete(entity: string, id: string, contextId?: string): Promise<boolean> {
    if (!this.handler.delete) return false;
    return this.handler.delete(entity, id, contextId);
  }

  async ping(): Promise<boolean> {
    if (this.handler.ping) return this.handler.ping();
    return true;
  }
}

/**
 * Convenience Factory Function for creating a custom database adapter
 */
export function createDatabaseAdapter(name: string, handler: GenericDatabaseHandler): OrbitoXDatabaseAdapter {
  return new GenericDatabaseAdapter(name, handler);
}
