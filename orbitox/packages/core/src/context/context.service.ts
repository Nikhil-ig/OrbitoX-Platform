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
    const parentId = payload.parentId || 'platform_root';
    const compositeKey = `${parentId}:${payload.slug}`;
    
    if (this.slugIndex.has(compositeKey)) {
      throw new Error(`Context with slug '${payload.slug}' already exists under parent '${parentId}'`);
    }

    const id = `ctx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    let rootId = 'platform_root';
    let path = id;
    let depth = 0;

    const parent = this.contexts.get(parentId) || Array.from(this.contexts.values()).find(c => c.slug === parentId);
    const resolvedParentId = parent ? parent.id : parentId;

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
      parentId: resolvedParentId,
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
    // Store composite key parentId:slug and parentSlug:slug
    this.slugIndex.set(`${resolvedParentId}:${context.slug}`, id);
    if (parent) {
      this.slugIndex.set(`${parent.slug}:${context.slug}`, id);
      this.slugIndex.set(`${parent.slug}/${context.slug}`, id);
    }
    // Also store plain slug if not already taken (fallback)
    if (!this.slugIndex.has(context.slug)) {
      this.slugIndex.set(context.slug, id);
    }
    
    this.logger.debug(`Created context ${id} (${payload.slug}) at depth ${depth}`);
    return context;
  }

  resolveContext(identifier: string, parentId?: string): Context | undefined {
    // 1. Try direct ID match
    if (this.contexts.has(identifier)) {
      return this.contexts.get(identifier);
    }

    // 2. Try parentId-scoped lookup
    if (parentId) {
      const parent = this.resolveContext(parentId);
      if (parent) {
        const compositeKey = `${parent.id}:${identifier}`;
        const compositeSlugKey = `${parent.slug}:${identifier}`;
        const id = this.slugIndex.get(compositeKey) || this.slugIndex.get(compositeSlugKey);
        if (id) return this.contexts.get(id);
      }
    }

    // 3. Try slash-scoped path (e.g. 'acme/ny-franchise')
    if (identifier.includes('/')) {
      const id = this.slugIndex.get(identifier);
      if (id) return this.contexts.get(id);
    }
    
    // 4. Try global slug fallback
    const fallbackId = this.slugIndex.get(identifier);
    if (fallbackId) {
      return this.contexts.get(fallbackId);
    }
    
    return undefined;
  }

  updateContext(identifier: string, updates: Partial<Context>, parentId?: string): Context {
    const context = this.resolveContext(identifier, parentId);
    if (!context) {
      throw new Error(`Context ${identifier} not found`);
    }

    const updated = {
      ...context,
      ...updates,
      updatedAt: new Date().toISOString()
    };
    
    // Deep merge for nested objects like settings, theme
    if (updates.settings) updated.settings = { ...context.settings, ...updates.settings };
    if (updates.theme) updated.theme = { ...context.theme, ...updates.theme };
    if (updates.features) updated.features = { ...context.features, ...updates.features };

    this.contexts.set(context.id, updated);
    this.logger.debug(`Updated context ${context.id}`);
    return updated;
  }

  deleteContext(identifier: string, parentId?: string): boolean {
    const context = this.resolveContext(identifier, parentId);
    if (!context) return false;

    // Check if it's the root (cannot delete root)
    if (context.id === 'platform_root') {
      throw new Error(`Cannot delete platform_root context`);
    }

    this.slugIndex.delete(context.slug);
    const deleted = this.contexts.delete(context.id);
    if (deleted) {
      this.logger.debug(`Deleted context ${context.id}`);
    }
    return deleted;
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

  // Map of `${fromContextId}:${toContextId}` -> Set of granted permissions (e.g., 'inventory.read', 'supply.request')
  private readonly peerPermissions = new Map<string, Set<string>>();

  linkPeers(fromIdentifier: string, toIdentifier: string, permissions: string[] = ['inventory.read', 'supply.request', 'messages.send']): void {
    const fromCtx = this.resolveContext(fromIdentifier);
    const toCtx = this.resolveContext(toIdentifier);
    if (!fromCtx || !toCtx) throw new Error(`Cannot link peers: invalid context identifier(s)`);

    const key1 = `${fromCtx.id}:${toCtx.id}`;
    const key2 = `${toCtx.id}:${fromCtx.id}`;

    if (!this.peerPermissions.has(key1)) this.peerPermissions.set(key1, new Set());
    if (!this.peerPermissions.has(key2)) this.peerPermissions.set(key2, new Set());

    for (const p of permissions) {
      this.peerPermissions.get(key1)!.add(p);
      this.peerPermissions.get(key2)!.add(p);
    }
  }

  canPeerAccess(fromIdentifier: string, toIdentifier: string, permission: string): boolean {
    const fromCtx = this.resolveContext(fromIdentifier);
    const toCtx = this.resolveContext(toIdentifier);
    if (!fromCtx || !toCtx) return false;
    if (fromCtx.id === toCtx.id) return true;

    // Verify both belong to the same Organization ancestor if not explicit mesh
    const fromAncestors = this.getAncestors(fromCtx.id).map(a => a.id);
    const toAncestors = this.getAncestors(toCtx.id).map(a => a.id);
    const sharesOrg = fromAncestors.some(a => toAncestors.includes(a));

    if (!sharesOrg && (!fromCtx.relatedContexts || !fromCtx.relatedContexts.includes(toCtx.id))) {
      return false;
    }

    const key = `${fromCtx.id}:${toCtx.id}`;
    const perms = this.peerPermissions.get(key);
    return perms ? perms.has(permission) || perms.has('*') : false;
  }

  getAccessiblePeerContexts(fromIdentifier: string, permission: string): Context[] {
    const fromCtx = this.resolveContext(fromIdentifier);
    if (!fromCtx) return [];

    const accessible: Context[] = [fromCtx];
    for (const [key, perms] of this.peerPermissions.entries()) {
      const [fId, tId] = key.split(':');
      if (fId && tId && fId === fromCtx.id && (perms.has(permission) || perms.has('*'))) {
        const peer = this.contexts.get(tId);
        if (peer && !accessible.some(c => c.id === peer.id)) {
          accessible.push(peer);
        }
      }
    }
    return accessible;
  }
}
