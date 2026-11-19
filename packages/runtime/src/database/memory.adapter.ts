import * as crypto from 'crypto';
import { OrbitoXDatabaseAdapter, DatabaseQueryOptions, DatabaseQueryResult } from './types';

/**
 * Built-in In-Memory Database Adapter
 * ─────────────────────────────────────────────────────────────
 * Provides fast, zero-dependency persistence with automatic
 * multi-tenant context isolation, pagination, and sorting.
 */
export class MemoryDatabaseAdapter implements OrbitoXDatabaseAdapter {
  readonly name = 'memory';
  private readonly store = new Map<string, Map<string, any>>();

  private getEntityStore(entity: string): Map<string, any> {
    if (!this.store.has(entity)) {
      this.store.set(entity, new Map());
    }
    return this.store.get(entity)!;
  }

  async findMany<T = any>(entity: string, options: DatabaseQueryOptions = {}): Promise<DatabaseQueryResult<T>> {
    const entityStore = this.getEntityStore(entity);
    let items = Array.from(entityStore.values());

    // 1. Multi-Tenant Context Filter (allowedContextIds or contextId)
    if (options.allowedContextIds && options.allowedContextIds.length > 0) {
      items = items.filter(item => !item.contextId || options.allowedContextIds!.includes(item.contextId));
    } else if (options.contextId) {
      items = items.filter(item => !item.contextId || item.contextId === options.contextId);
    }

    // 2. Custom Filter Matching
    if (options.filter && Object.keys(options.filter).length > 0) {
      items = items.filter(item => {
        return Object.entries(options.filter!).every(([key, value]) => {
          if (value === undefined) return true;
          return item[key] === value;
        });
      });
    }

    const total = items.length;

    // 3. Sorting
    const sortField = options.sort?.startsWith('-') ? options.sort.slice(1) : options.sort || 'createdAt';
    const isDesc = options.sort?.startsWith('-') ?? true;

    items.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });

    // 4. Pagination
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 1000);
    const startIndex = (page - 1) * limit;
    const paginatedItems = items.slice(startIndex, startIndex + limit);

    return {
      data: paginatedItems as T[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        sort: options.sort,
        filters: options.filter
      }
    };
  }

  async findById<T = any>(entity: string, id: string, contextId?: string): Promise<T | null> {
    const entityStore = this.getEntityStore(entity);
    const item = entityStore.get(id);
    if (!item) return null;

    if (contextId && item.contextId && item.contextId !== contextId) {
      return null; // Context isolation
    }

    return item as T;
  }

  async create<T = any>(entity: string, data: Partial<T>, contextId?: string): Promise<T> {
    const entityStore = this.getEntityStore(entity);
    const id = (data as any).id || `${entity}_${crypto.randomUUID()}`;
    
    const record = {
      id,
      ...data,
      contextId: contextId || (data as any).contextId || null,
      createdAt: (data as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    entityStore.set(id, record);
    return record as T;
  }

  async update<T = any>(entity: string, id: string, data: Partial<T>, contextId?: string): Promise<T> {
    const entityStore = this.getEntityStore(entity);
    const existing = await this.findById(entity, id, contextId);
    if (!existing) {
      throw new Error(`Record with id '${id}' not found in entity '${entity}'`);
    }

    const updated = {
      ...existing,
      ...data,
      id, // Immutable ID
      contextId: (existing as any).contextId, // Immutable context
      updatedAt: new Date().toISOString()
    };

    entityStore.set(id, updated);
    return updated as T;
  }

  async delete(entity: string, id: string, contextId?: string): Promise<boolean> {
    const entityStore = this.getEntityStore(entity);
    const existing = await this.findById(entity, id, contextId);
    if (!existing) return false;

    return entityStore.delete(id);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  /**
   * Helper to clear in-memory stores during testing
   */
  clear(): void {
    this.store.clear();
  }
}
