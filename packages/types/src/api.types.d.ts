/**
 * @module @orbitox/types/api
 * Standard API Request/Response shapes
 */
import { ThemeConfig, FeatureFlags } from './context.types';
import { SubscriptionInfo } from './context.types';
/**
 * Pagination metadata for list responses.
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
/**
 * Standard API Response envelope (Rule B5)
 */
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    pagination?: PaginationMeta;
    requestId: string;
    timestamp: string;
}
/**
 * Helper type for returning paginated results internally.
 */
export interface PaginatedResult<T> {
    items: T[];
    total: number;
}
/**
 * Standard query parameters for list endpoints.
 */
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortDesc?: boolean;
    search?: string;
}
/**
 * Injected into every authenticated request.
 * Contains the fully resolved context and user identity.
 */
export interface RequestContext {
    contextId: string;
    contextType: string;
    userId: string;
    tenantId: string | null;
    organisationId: string | null;
    permissions: string[];
    plugins: string[];
    locale: string;
    theme: ThemeConfig;
    subscription: SubscriptionInfo;
    features: FeatureFlags;
}
//# sourceMappingURL=api.types.d.ts.map