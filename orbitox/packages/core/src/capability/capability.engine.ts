import { Injectable, Logger } from '@nestjs/common';
import { Capability, CapabilityAdapter, CapabilityConfig } from './types';
import { ContextService } from '../context/context.service';

@Injectable()
export class CapabilityEngine {
  private readonly logger = new Logger(CapabilityEngine.name);
  
  // Registry of capabilities (e.g., "ai", "notifications")
  private readonly capabilities = new Map<string, Capability>();
  
  // Registry of adapters for each capability: capabilityId -> providerId -> Adapter
  private readonly adapters = new Map<string, Map<string, CapabilityAdapter>>();

  constructor(private readonly contextService: ContextService) {}

  registerCapability(capability: Capability): void {
    if (this.capabilities.has(capability.id)) {
      this.logger.warn(`Capability ${capability.id} is already registered. Overwriting.`);
    }
    this.capabilities.set(capability.id, capability);
    this.adapters.set(capability.id, new Map());
    this.logger.debug(`Registered capability: ${capability.id} (${capability.displayName})`);
  }

  registerAdapter(capabilityId: string, adapter: CapabilityAdapter): void {
    if (!this.capabilities.has(capabilityId)) {
      throw new Error(`Cannot register adapter for unknown capability: ${capabilityId}`);
    }

    const adapterMap = this.adapters.get(capabilityId)!;
    adapterMap.set(adapter.providerId, adapter);
    this.logger.debug(`Registered adapter '${adapter.providerId}' for capability '${capabilityId}'`);
  }

  async resolve<T extends CapabilityAdapter>(capabilityId: string, contextId: string): Promise<T> {
    const capability = this.capabilities.get(capabilityId);
    if (!capability) {
      throw new Error(`Capability not found: ${capabilityId}`);
    }

    // 1. Resolve configuration from ContextEngine
    const context = this.contextService.resolveContext(contextId);
    
    // Look up capability configuration for this specific context, fall back to default
    const configSettings = context?.settings?.capabilities || {};
    const capConfig: CapabilityConfig = configSettings[capabilityId] || {
      provider: capability.defaultProvider,
      options: {}
    };

    const providerId = capConfig.provider;

    // 2. Resolve adapter
    const adapterMap = this.adapters.get(capabilityId);
    if (!adapterMap || !adapterMap.has(providerId)) {
      throw new Error(`Provider '${providerId}' not found for capability '${capabilityId}'`);
    }

    const adapter = adapterMap.get(providerId)! as T;

    // 3. Initialize adapter with context-specific options
    await adapter.init(capConfig.options);

    return adapter;
  }
}
