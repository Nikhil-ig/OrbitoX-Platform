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
/**
 * Standard shape for all events in the system.
 */
export interface PlatformEvent<T = Record<string, unknown>> {
    name: string;
    payload: T;
    meta: EventMetadata;
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