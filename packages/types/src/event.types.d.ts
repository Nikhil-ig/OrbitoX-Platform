/**
 * @module @orbitox/types/event
 * Types for the Event Bus
 */
/**
 * Metadata attached to every event for tracing and context.
 */
export interface EventMetadata {
    eventId: string;
    correlationId: string;
    timestamp: Date;
    contextId: string;
    userId: string | null;
    sourcePlugin: string;
}
export interface PlatformEvent<T = Record<string, unknown>> {
    id: string;
    name: string;
    version: string;
    schemaVersion: number;
    contextId: string;
    tenantId?: string;
    organisationId?: string;
    correlationId: string;
    causationId?: string;
    requestId?: string;
    source: string;
    userId?: string;
    payload: T;
    occurredAt: Date;
    publishedAt: Date;
}
/**
 * Subscription definition for an event handler.
 */
export interface EventSubscription {
    eventName: string;
    handlerName: string;
    pluginId: string;
}
//# sourceMappingURL=event.types.d.ts.map