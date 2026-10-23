/**
 * 🪐 @orbitox/external-project-engine
 * The Official Project Factory and Controller Plugin for OrbitoX Platform.
 */

export * from './types';
export * from './services/control-store.service';
export * from './services/project-factory.service';
export * from './services/api-registry.service';
export * from './services/central-quote.service';
export * from './services/runtime-controller.service';
export * from './services/project-keys';
export * from './services/fleet-snapshot';
export * from './services/fleet.service';
export * from './repositories';

import { ProjectFactoryService } from './services/project-factory.service';
import { ApiRegistryService } from './services/api-registry.service';
import { CentralQuoteService } from './services/central-quote.service';
import { RuntimeControllerService } from './services/runtime-controller.service';
import { FleetService } from './services/fleet.service';
import { platformRepositories, PlatformRepositories } from './repositories';

export class ExternalProjectEngine {
  public readonly factory: ProjectFactoryService;
  public readonly apiRegistry: ApiRegistryService;
  public readonly quoteService: CentralQuoteService;
  public readonly runtimeController: RuntimeControllerService;
  public readonly fleet: FleetService;
  public readonly repositories: PlatformRepositories;

  constructor() {
    this.apiRegistry = new ApiRegistryService();
    this.runtimeController = new RuntimeControllerService();
    this.fleet = new FleetService();
    this.quoteService = new CentralQuoteService();
    this.factory = new ProjectFactoryService(this.apiRegistry, this.runtimeController);
    this.repositories = platformRepositories;
  }
}

// Global Singleton
const globalForEngine = globalThis as unknown as { externalProjectEngine?: ExternalProjectEngine };
export const externalProjectEngine = globalForEngine.externalProjectEngine || new ExternalProjectEngine();
globalForEngine.externalProjectEngine = externalProjectEngine;
