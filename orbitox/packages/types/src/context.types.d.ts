/**
 * @module @orbitox/types/context
 * Universal Context Engine types — Part 04 of the OrbitoX Platform Bible.
 *
 * A Context is any node in the platform hierarchy.
 * It replaces fixed tenant tiers with a flexible context graph
 * supporting B2B, B2C, B2B2C, marketplace, franchise, and government models.
 */
import { Timestamped } from './common.types';
/**
 * Platform-provided context types (always available).
 */
export declare enum PlatformContextType {
    PLATFORM = "platform",
    ORGANISATION = "organisation",
    TENANT = "tenant",
    BRANCH = "branch"
}
/**
 * All valid context type strings.
 * Plugins can register additional types beyond PlatformContextType.
 */
export type ContextType = PlatformContextType | string;
/**
 * Context status lifecycle.
 */
export type ContextStatus = 'active' | 'suspended' | 'archived';
/**
 * Per-context branding configuration.
 * Resolved through the inheritance chain: platform → org → tenant → branch.
 */
export interface ThemeConfig {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
    favicon?: string;
    fontFamily?: string;
    borderRadius?: string;
    darkMode?: boolean;
    customCss?: string;
}
/**
 * Defines data isolation rules for a context.
 */
export interface DataScope {
    /** If true, this context can see data from child contexts */
    canAccessChildren: boolean;
    /** If true, this context can see data from sibling contexts */
    canAccessSiblings: boolean;
    /** Explicit list of context IDs this context can access */
    additionalAccessibleContexts: string[];
}
/**
 * Reference to an attached policy (ABAC + PBAC evaluation).
 */
export interface PolicyRef {
    policyId: string;
    policyType: 'access' | 'data' | 'rate-limit' | 'feature';
    priority: number;
}
/**
 * Lightweight subscription info embedded in context.
 * Full subscription details live in the billing module.
 */
export interface SubscriptionInfo {
    subscriptionId: string | null;
    planId: string | null;
    planName: string | null;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | null;
}
/**
 * Feature flags map for a context.
 */
export type FeatureFlags = Record<string, boolean>;
/**
 * The core Context entity — the universal node in the OrbitoX hierarchy.
 * Directly maps to the `contexts` database table.
 */
export interface Context extends Timestamped {
    /** UUID v4 primary key */
    id: string;
    /** Context type — 'platform', 'organisation', 'tenant', 'branch', or plugin-registered */
    type: ContextType;
    /** URL-friendly identifier, unique across platform */
    slug: string;
    /** Human-readable display name */
    displayName: string;
    /** Parent context ID. null = root (platform) context */
    parentId: string | null;
    /** Root context ID — always the platform root */
    rootId: string;
    /** LTREE materialized path for fast ancestor/descendant queries */
    path: string;
    /** Depth in the hierarchy. 0 = platform, 1 = org, 2 = tenant, etc. */
    depth: number;
    /** User who owns/administers this context */
    ownerId: string | null;
    /** Per-context branding */
    theme: ThemeConfig;
    /** BCP 47 locale string */
    locale: string;
    /** IANA timezone identifier */
    timezone: string;
    /** ISO 4217 currency code */
    currency: string;
    /** Arbitrary context-specific settings */
    settings: Record<string, unknown>;
    /** Active plugin IDs for this context */
    plugins: string[];
    /** Feature flags for this context */
    features: FeatureFlags;
    /** Active capability identifiers */
    capabilities: string[];
    /** Stripe/payment subscription ID */
    subscriptionId: string | null;
    /** Active plan ID */
    planId: string | null;
    /** Billing contact email */
    billingEmail: string | null;
    /** Data isolation rules */
    dataScope: DataScope;
    /** Attached policy references */
    policies: PolicyRef[];
    /** Lifecycle status */
    status: ContextStatus;
}
/**
 * Methods by which a context can be resolved from an incoming request.
 * Resolution order: customDomain → subdomain → jwt → header
 */
export declare enum ContextResolutionMethod {
    CUSTOM_DOMAIN = "custom_domain",
    SUBDOMAIN = "subdomain",
    JWT = "jwt",
    HEADER = "header"
}
/**
 * Result of context resolution from a request.
 */
export interface ContextResolutionResult {
    contextId: string;
    method: ContextResolutionMethod;
    rawValue: string;
}
/**
 * Maps a custom domain or subdomain to a context.
 */
export interface ContextDomainMapping {
    id: string;
    contextId: string;
    domain: string;
    isCustomDomain: boolean;
    isPrimary: boolean;
    sslStatus: 'pending' | 'active' | 'failed';
    createdAt: Date;
}
/**
 * Represents the effective (merged) configuration for a context,
 * resolved by walking up the ancestor chain.
 */
export interface EffectiveContextConfig {
    contextId: string;
    resolvedValues: Record<string, unknown>;
    /** Shows which ancestor provided each config value */
    sources: Record<string, {
        contextId: string;
        contextType: ContextType;
    }>;
}
//# sourceMappingURL=context.types.d.ts.map