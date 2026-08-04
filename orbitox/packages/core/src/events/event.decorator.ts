import { SetMetadata } from '@nestjs/common';

export const EVENT_SUBSCRIBER_KEY = 'orbitox:event_subscriber';

export interface EventSubscriberMetadata {
  eventName: string;
}

/**
 * Decorator to mark a method as an event subscriber.
 * @param eventName The name of the event to subscribe to (e.g., 'crm.lead.created' or '*')
 */
export const EventSubscriber = (eventName: string) => 
  SetMetadata(EVENT_SUBSCRIBER_KEY, { eventName } as EventSubscriberMetadata);
