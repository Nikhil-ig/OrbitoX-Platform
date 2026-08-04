import { Module } from '@nestjs/common';
import { RbacModule, EventsModule } from '@orbitox/core';
import { ManifestValidator } from './manifest.validator';
import { PluginLoaderService } from './plugin-loader.service';
import { PluginLifecycleService } from './plugin-lifecycle.service';
import { MarketplaceService } from './marketplace/marketplace.service';
import { MenuRegistry } from './registries/menu.registry';
import { PageRegistry } from './registries/page.registry';
import { WidgetRegistry } from './registries/widget.registry';

@Module({
  imports: [RbacModule, EventsModule],
  providers: [
    ManifestValidator,
    PluginLoaderService,
    PluginLifecycleService,
    MarketplaceService,
    MenuRegistry,
    PageRegistry,
    WidgetRegistry,
  ],
  exports: [
    PluginLoaderService,
    PluginLifecycleService,
    MarketplaceService,
    MenuRegistry,
    PageRegistry,
    WidgetRegistry,
  ],
})
export class PluginEngineModule {}
