import { OrbitoXDatabaseAdapter, DatabaseQueryOptions, DatabaseQueryResult } from './types';

/**
 * Prisma Universal Database Adapter for OrbitoX Platform
 * ─────────────────────────────────────────────────────────────
 * Connects Prisma Client directly to the OrbitoX Database Facade (`orbitox.db`).
 * Enforces multi-tenancy context isolation on all queries automatically.
 */
export class PrismaDatabaseAdapter implements OrbitoXDatabaseAdapter {
  readonly name = 'prisma-postgresql';
  private readonly prisma: any;

  constructor(prismaClient: any) {
    this.prisma = prismaClient;
  }

  async findMany<T = any>(entity: string, options: DatabaseQueryOptions = {}): Promise<DatabaseQueryResult<T>> {
    const delegate = this.getDelegate(entity);
    if (!delegate) {
      return { data: [], meta: { page: 1, limit: 20, total: 0 } };
    }

    const where: Record<string, any> = { ...(options.filter || {}) };
    if (options.contextId) {
      where.contextId = options.contextId;
    } else if (options.allowedContextIds && options.allowedContextIds.length > 0) {
      where.contextId = { in: options.allowedContextIds };
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        skip,
        take: limit,
        orderBy: options.sort ? this.parseSort(options.sort) : { createdAt: 'desc' },
      }),
      delegate.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        filters: options.filter,
      },
    };
  }

  async findById<T = any>(entity: string, id: string, contextId?: string): Promise<T | null> {
    const delegate = this.getDelegate(entity);
    if (!delegate) return null;

    const where: Record<string, any> = { id };
    if (contextId) where.contextId = contextId;

    return delegate.findFirst({ where });
  }

  async create<T = any>(entity: string, data: Partial<T>, contextId?: string): Promise<T> {
    const delegate = this.getDelegate(entity);
    if (!delegate) throw new Error(`Prisma delegate for '${entity}' not found.`);

    const payload = { ...data };
    if (contextId && !(payload as any).contextId) {
      (payload as any).contextId = contextId;
    }

    return delegate.create({ data: payload });
  }

  async update<T = any>(entity: string, id: string, data: Partial<T>, contextId?: string): Promise<T> {
    const delegate = this.getDelegate(entity);
    if (!delegate) throw new Error(`Prisma delegate for '${entity}' not found.`);

    const where: Record<string, any> = { id };
    if (contextId) where.contextId = contextId;

    return delegate.update({
      where: { id },
      data,
    });
  }

  async delete(entity: string, id: string, contextId?: string): Promise<boolean> {
    const delegate = this.getDelegate(entity);
    if (!delegate) return false;

    try {
      await delegate.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  async ping(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private getDelegate(entity: string): any {
    const modelName = entity.toLowerCase();
    return this.prisma[modelName] || this.prisma[entity];
  }

  private parseSort(sortStr: string): Record<string, 'asc' | 'desc'> {
    if (sortStr.startsWith('-')) {
      return { [sortStr.substring(1)]: 'desc' };
    }
    return { [sortStr]: 'asc' };
  }
}
