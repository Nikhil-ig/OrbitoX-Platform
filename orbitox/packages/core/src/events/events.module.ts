import { Module, Global, OnModuleInit } from '@nestjs/common';
import { DiscoveryModule, DiscoveryService, Reflector } from '@nestjs/core';
import { EventBusService } from './event-bus.service';
import { EventStoreService } from './event-store.service';
import { EVENT_SUBSCRIBER_KEY, EventSubscriberMetadata } from './event.decorator';
import { PlatformEvent } from '@orbitox/types';

@Global()
@Module({
  imports: [DiscoveryModule],
  providers: [
    EventBusService,
    EventStoreService,
  ],
  exports: [
    EventBusService,
    EventStoreService,
  ],
})
export class EventsModule implements OnModuleInit {
  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly reflector: Reflector,
    private readonly eventBus: EventBusService,
  ) {}

  onModuleInit() {
    this.discoverAndRegisterSubscribers();
  }

  private discoverAndRegisterSubscribers() {
    const providers = this.discoveryService.getProviders();

    for (const wrapper of providers) {
      const { instance } = wrapper;
      if (!instance || typeof instance !== 'object') {
        continue;
      }

      const prototype = Object.getPrototypeOf(instance);
      if (!prototype) continue;

      const methodNames = Object.getOwnPropertyNames(prototype);

      for (const methodName of methodNames) {
        const method = prototype[methodName];
        if (typeof method !== 'function') continue;

        const metadata = this.reflector.get<EventSubscriberMetadata>(
          EVENT_SUBSCRIBER_KEY,
          method,
        );

        if (metadata) {
          const handler = method.bind(instance);
          const consumerName = `${instance.constructor.name}.${methodName}`;
          
          this.eventBus.subscribe(
            metadata.eventName,
            handler as (event: PlatformEvent<any>) => Promise<void>,
            consumerName
          );
        }
      }
    }
  }
}
