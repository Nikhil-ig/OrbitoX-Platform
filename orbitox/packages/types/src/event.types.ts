/**
 * @module @orbitox/types/event
 * Types for the Event Bus
 */

/**
 * Metadata attached to every event for tracing and context.
 */
export interface EventMetadata {
  eventId: string;
  correlationId: string; // Used to track a workflow across multiple events
  timestamp: Date;
  contextId: string;     // The context this event occurred in
  userId: string | null; // The user who triggered the event
  sourcePlugin: string;  // The plugin that emitted the event
}

/**
 * Standard shape for all events in the system.
 */
export interface PlatformEvent<T = Record<string, unknown>> {
  name: string;          // Format: {domain}.{entity}.{action}
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
