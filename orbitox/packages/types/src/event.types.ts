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

export interface PlatformEvent<T = Record<string, unknown>> {
  // Event identity
  id: string;                    // UUID — globally unique
  name: string;                  // 'crm.lead.created'
  version: string;               // '1.0' — for schema evolution
  schemaVersion: number;         // integer increment

  // Context
  contextId: string;             // which context this happened in
  tenantId?: string;             // resolved tenant
  organisationId?: string;       // resolved organisation

  // Tracing
  correlationId: string;         // ties related events together
  causationId?: string;          // event ID that caused this event
  requestId?: string;            // originating HTTP request ID

  // Source
  source: string;                // 'crm-plugin' | 'auth-service' | ...
  userId?: string;               // who triggered this (null = system)

  // Payload
  payload: T;

  // Timestamps
  occurredAt: Date;              // when the fact happened
  publishedAt: Date;             // when it was published to the bus
}

/**
 * Subscription definition for an event handler.
 */
export interface EventSubscription {
  eventName: string;
  handlerName: string;
  pluginId: string;
}
