import { Injectable, Logger } from '@nestjs/common';

export interface GdprExportData {
  pluginId: string;
  data: Record<string, any>;
}

export interface GdprDataHandler {
  pluginId: string;
  exportData(userId: string, contextId: string): Promise<Record<string, any>>;
  eraseData(userId: string, contextId: string): Promise<void>;
}

@Injectable()
export class GdprComplianceService {
  private readonly logger = new Logger(GdprComplianceService.name);
  private handlers: Map<string, GdprDataHandler> = new Map();

  registerHandler(handler: GdprDataHandler): void {
    if (this.handlers.has(handler.pluginId)) {
      throw new Error(`GDPR Handler for plugin ${handler.pluginId} is already registered.`);
    }
    this.handlers.set(handler.pluginId, handler);
    this.logger.log(`Registered GDPR data handler for plugin: ${handler.pluginId}`);
  }

  async exportUserData(userId: string, contextId: string): Promise<GdprExportData[]> {
    this.logger.log(`Starting GDPR Data Export for user [${userId}] in context [${contextId}]`);
    const exportResult: GdprExportData[] = [];

    for (const [pluginId, handler] of this.handlers.entries()) {
      try {
        const data = await handler.exportData(userId, contextId);
        if (Object.keys(data).length > 0) {
          exportResult.push({
            pluginId,
            data
          });
        }
      } catch (err: any) {
        this.logger.error(`Failed to export data from plugin ${pluginId}: ${err.message}`);
        throw new Error(`GDPR Export failed at plugin ${pluginId}`);
      }
    }

    this.logger.log(`Completed GDPR Data Export for user [${userId}]. Fetched data from ${exportResult.length} plugins.`);
    return exportResult;
  }

  async eraseUserData(userId: string, contextId: string): Promise<void> {
    this.logger.log(`Starting GDPR Right to Erasure for user [${userId}] in context [${contextId}]`);

    for (const [pluginId, handler] of this.handlers.entries()) {
      try {
        await handler.eraseData(userId, contextId);
        this.logger.log(`Erased user data from plugin: ${pluginId}`);
      } catch (err: any) {
        this.logger.error(`Failed to erase data from plugin ${pluginId}: ${err.message}`);
        throw new Error(`GDPR Erasure failed at plugin ${pluginId}`);
      }
    }

    this.logger.log(`Completed GDPR Right to Erasure for user [${userId}]. All registered plugins executed erasure protocols.`);
  }
}
