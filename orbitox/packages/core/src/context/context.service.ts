import { Injectable, Logger } from '@nestjs/common';
import { Context, CreateContextPayload, PlatformContextType } from './types';

@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  
  // In a real system, this is backed by PostgreSQL with an LTREE index.
  // Here we use an in-memory graph map.
  private readonly contexts = new Map<string, Context>();
  private readonly slugIndex = new Map<string, string>();

  constructor() {
    this.createRootContext();
  }

  private createRootContext() {
    const rootId = 'platform_root';
    const rootContext: Context = {
      id: rootId,
      type: 'platform',
      slug: 'root',
      displayName: 'OrbitoX Platform Root',
      parentId: null,
      rootId: rootId,
      path: rootId,
      depth: 0,
      ownerId: 'system',
      theme: {},
      locale: 'en',
      timezone: 'UTC',
      currency: 'USD',
      settings: {},
      plugins: [],
      features: {},
      capabilities: [],
      subscriptionId: null,
      planId: null,
      billingEmail: null,
      dataScope: {},
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.contexts.set(rootId, rootContext);
    this.slugIndex.set('root', rootId);
  }

  createContext(payload: CreateContextPayload): Context {
    if (this.slugIndex.has(payload.slug)) {
      throw new Error(`Context with slug '${payload.slug}' already exists`);
    }

    const id = `ctx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let parentId = payload.parentId || 'platform_root';
    let rootId = 'platform_root';
    let path = id;
    let depth = 0;

    const parent = this.contexts.get(parentId);
    if (parent) {
      rootId = parent.rootId;
      path = `${parent.path}.${id}`;
      depth = parent.depth + 1;
    }

    const context: Context = {
      id,
      type: payload.type,
      slug: payload.slug,
      displayName: payload.displayName,
      parentId,
      relatedContexts: payload.relatedContexts || [],
      rootId,
      path,
      depth,
      ownerId: payload.ownerId,
      
      theme: payload.theme || {},
      locale: payload.locale || 'en',
      timezone: payload.timezone || 'UTC',
      currency: payload.currency || 'USD',
      settings: payload.settings || {},
      
      plugins: payload.plugins || [],
      features: payload.features || {},
      capabilities: payload.capabilities || [],
      
      subscriptionId: payload.subscriptionId || null,
      planId: payload.planId || null,
      billingEmail: payload.billingEmail || null,
      
      dataScope: payload.dataScope || {},
      
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.contexts.set(id, context);
    this.slugIndex.set(context.slug, id);
    
    this.logger.debug(`Created context ${id} (${payload.slug}) at depth ${depth}`);
    return context;
  }

  resolveContext(identifier: string): Context | undefined {
    // Try by ID first
    if (this.contexts.has(identifier)) {
      return this.contexts.get(identifier);
    }
    
    // Try by Slug
    const id = this.slugIndex.get(identifier);
    if (id) {
      return this.contexts.get(id);
    }
    
    return undefined;
  }

  resolveConfig<K extends keyof Context>(contextId: string, keys: K[]): Pick<Context, K> {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new Error(`Context ${contextId} not found`);
    }

    const result = {} as any;
    const hierarchy = this.getHierarchy(contextId);

    for (const key of keys) {
      // Find the first context in the hierarchy (bottom-up) that has this key defined explicitly
      // For simplicity in this mock, we just walk up
      let found = false;
      for (const node of hierarchy) {
        if (node[key] !== undefined && node[key] !== null) {
           // For objects like theme, a deeper merge would be required in production
           result[key] = node[key];
           found = true;
           break;
        }
      }
      
      // If no node has it, default to the root (which has defaults for everything)
      if (!found) {
        const root = this.contexts.get('platform_root');
        if (root) result[key] = root[key];
      }
    }

    return result;
  }

  /**
   * Returns an array of Contexts from the given node up to the root.
   * Index 0 is the current context, last index is the root.
   */
  getHierarchy(contextId: string): Context[] {
    const hierarchy: Context[] = [];
    let currentId: string | null = contextId;

    while (currentId) {
      const current = this.contexts.get(currentId);
      if (!current) break;
      hierarchy.push(current);
      currentId = current.parentId;
    }

    return hierarchy;
  }

  getChildren(contextId: string): Context[] {
    const children: Context[] = [];
    for (const context of this.contexts.values()) {
      if (context.parentId === contextId) {
        children.push(context);
      }
    }
    return children;
  }

  /**
   * Graph traversal: Get all ancestors (following parentId and relatedContexts)
   * with cycle detection.
   */
  getAncestors(contextId: string): Context[] {
    const ancestors: Context[] = [];
    const visited = new Set<string>();
    const queue: string[] = [contextId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const current = this.contexts.get(currentId);
      if (!current) continue;
      
      if (currentId !== contextId) {
        ancestors.push(current);
      }

      if (current.parentId && !visited.has(current.parentId)) {
        queue.push(current.parentId);
      }
      
      if (current.relatedContexts) {
        for (const relatedId of current.relatedContexts) {
          if (!visited.has(relatedId)) {
            queue.push(relatedId);
          }
        }
      }
    }
    
    return ancestors;
  }

  /**
   * Graph traversal: Get all descendants (contexts that have this context as parentId or in relatedContexts)
   * with cycle detection.
   */
  getDescendants(contextId: string): Context[] {
    const descendants: Context[] = [];
    const visited = new Set<string>();
    const queue: string[] = [contextId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      const current = this.contexts.get(currentId);
      if (!current && currentId !== contextId) continue;
      
      if (currentId !== contextId && current) {
        descendants.push(current);
      }

      // Find all contexts that point to currentId
      for (const ctx of this.contexts.values()) {
        const isChild = ctx.parentId === currentId;
        const isRelated = ctx.relatedContexts?.includes(currentId);
        
        if ((isChild || isRelated) && !visited.has(ctx.id)) {
          queue.push(ctx.id);
        }
      }
    }
    
    return descendants;
  }
}
