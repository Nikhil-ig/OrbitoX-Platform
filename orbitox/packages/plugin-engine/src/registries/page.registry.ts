import { Injectable, Logger } from '@nestjs/common';
import { PluginPageItem } from '@orbitox/sdk';

@Injectable()
export class PageRegistry {
  private readonly logger = new Logger(PageRegistry.name);
  private readonly pagesByContext = new Map<string, PluginPageItem[]>();

  register(contextId: string, pluginId: string, pages: PluginPageItem[]): void {
    this.logger.log(`Registering ${pages.length} pages for plugin ${pluginId} in context ${contextId}`);
    const existing = this.pagesByContext.get(contextId) || [];
    this.pagesByContext.set(contextId, [...existing, ...pages]);
  }

  getPages(contextId: string): PluginPageItem[] {
    return this.pagesByContext.get(contextId) || [];
  }
}
