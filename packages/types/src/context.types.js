"use strict";
/**
 * @module @orbitox/types/context
 * Universal Context Engine types — Part 04 of the OrbitoX Platform Bible.
 *
 * A Context is any node in the platform hierarchy.
 * It replaces fixed tenant tiers with a flexible context graph
 * supporting B2B, B2C, B2B2C, marketplace, franchise, and government models.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextResolutionMethod = exports.PlatformContextType = void 0;
// ---------------------------------------------------------------------------
// Context Types
// ---------------------------------------------------------------------------
/**
 * Platform-provided context types (always available).
 */
var PlatformContextType;
(function (PlatformContextType) {
    PlatformContextType["PLATFORM"] = "platform";
    PlatformContextType["ORGANISATION"] = "organisation";
    PlatformContextType["TENANT"] = "tenant";
    PlatformContextType["BRANCH"] = "branch";
})(PlatformContextType || (exports.PlatformContextType = PlatformContextType = {}));
// ---------------------------------------------------------------------------
// Context Resolution
// ---------------------------------------------------------------------------
/**
 * Methods by which a context can be resolved from an incoming request.
 * Resolution order: customDomain → subdomain → jwt → header
 */
var ContextResolutionMethod;
(function (ContextResolutionMethod) {
    ContextResolutionMethod["CUSTOM_DOMAIN"] = "custom_domain";
    ContextResolutionMethod["SUBDOMAIN"] = "subdomain";
    ContextResolutionMethod["JWT"] = "jwt";
    ContextResolutionMethod["HEADER"] = "header";
})(ContextResolutionMethod || (exports.ContextResolutionMethod = ContextResolutionMethod = {}));
//# sourceMappingURL=context.types.js.map