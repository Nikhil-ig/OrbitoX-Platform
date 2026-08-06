/**
 * ContextFacade
 * ─────────────────────────────────────────────────────────────
 * Manages the Context Tree — the backbone of multi-tenancy.
 * Contexts are: Platform > Organisation > Tenant > Branch > Sub-Entity
 */

import { ContextService, Context } from '@orbitox/core';
import { CreateContextPayload, PlatformContextType } from '@orbitox/core';

export class ContextFacade {
  constructor(private readonly svc: ContextService) {}

  /**
   * Resolve a context by ID or slug.
   * Returns undefined if not found (never throws).
   */
  get(idOrSlug: string): Context | undefined {
    return this.svc.resolveContext(idOrSlug);
  }

  /**
   * Update an existing context.
   */
  update(idOrSlug: string, updates: Partial<Context>): Context {
    return this.svc.updateContext(idOrSlug, updates);
  }

  /**
   * Delete a context.
   */
  delete(idOrSlug: string): boolean {
    return this.svc.deleteContext(idOrSlug);
  }

  /**
   * Create a new context node in the hierarchy.
   * @example
   * const tenant = await orbitox.context.create({ type: 'tenant', slug: 'acme', displayName: 'Acme Corp', ownerId: 'user_1' });
   */
  create(options: {
    slug: string;
    displayName: string;
    type: PlatformContextType;
    parentId?: string;
    ownerId?: string;
    locale?: string;
    currency?: string;
    timezone?: string;
    settings?: Record<string, any>;
  }): Context {
    const payload: CreateContextPayload = {
      slug: options.slug,
      displayName: options.displayName,
      type: options.type,
      parentId: options.parentId || null,
      ownerId: options.ownerId || 'system',
      locale: options.locale,
      currency: options.currency,
      timezone: options.timezone,
      settings: options.settings,
    };
    return this.svc.createContext(payload);
  }

  /**
   * Get the full ancestor chain from a context up to the platform root.
   */
  ancestors(contextId: string): Context[] {
    return this.svc.getAncestors(contextId);
  }

  /**
   * Get all direct children of a context.
   */
  children(contextId: string): Context[] {
    return this.svc.getChildren(contextId);
  }

  /**
   * Get all descendants of a context.
   */
  descendants(contextId: string): Context[] {
    return this.svc.getDescendants(contextId);
  }

  /**
   * Check if contextId is a descendant of parentId.
   */
  isChildOf(contextId: string, parentId: string): boolean {
    return this.svc.getAncestors(contextId).some(c => c.id === parentId);
  }

  /**
   * Resolve a config value, walking up the hierarchy until found.
   * Implements the "Inherited Config" pattern from Platform Bible Part 04.
   */
  resolveConfig<K extends keyof Context>(contextId: string, key: K): Context[K] | undefined {
    try {
      return this.svc.resolveConfig(contextId, [key])[key];
    } catch {
      return undefined;
    }
  }
}
