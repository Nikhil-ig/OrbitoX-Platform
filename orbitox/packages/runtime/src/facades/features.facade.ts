/**
 * FeaturesFacade
 * ─────────────────────────────────────────────────────────────
 * Per-context feature flag management.
 * Uses the SAME ContextService instance as the rest of the platform.
 *
 * Supports:
 * - Global flags (platform-wide on/off)
 * - Context-specific overrides (per-tenant, per-org, per-branch)
 * - Percentage rollouts
 * - Date-range rollouts
 */

import { FeatureFlagService } from '@orbitox/core';

export class FeaturesFacade {
  constructor(private readonly svc: FeatureFlagService) {}

  /**
   * Check if a feature flag is enabled for a given context.
   * Returns false by default (safe fail-closed behaviour).
   * 
   * @example
   * if (await orbitox.features.isEnabled('new-checkout', tenantId)) { ... }
   */
  async isEnabled(flagId: string, contextId: string = 'global'): Promise<boolean> {
    return this.svc.isEnabled(flagId, contextId);
  }

  /**
   * Check multiple flags at once. Returns a map of flagId → boolean.
   * @example
   * const flags = await orbitox.features.checkAll(['new-ui', 'ai-chat'], tenantId);
   */
  async checkAll(flagIds: string[], contextId: string = 'global'): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    await Promise.all(
      flagIds.map(async id => {
        results[id] = await this.isEnabled(id, contextId);
      })
    );
    return results;
  }

  /**
   * Register a new feature flag. Call once at platform boot.
   * @example
   * orbitox.features.define({ id: 'new-checkout', displayName: 'New Checkout Flow', defaultValue: false });
   */
  define(options: {
    id: string;
    displayName: string;
    description?: string;
    defaultValue?: boolean;
    category?: string;
  }): void {
    this.svc.registerFlag({
      id: options.id,
      displayName: options.displayName,
      description: options.description || options.displayName,
      defaultValue: options.defaultValue ?? false,
      category: options.category || 'general',
      overrides: [],
    } as any);
  }

  /**
   * Set an override for a specific context.
   */
  async setOverride(flagId: string, contextId: string, enabled: boolean): Promise<void> {
    await this.svc.setOverride(flagId, contextId, enabled);
  }
}
