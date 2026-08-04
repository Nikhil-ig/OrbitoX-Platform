import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  getLeads(contextId: string): any[] {
    this.logger.log(`Fetching leads for context ${contextId}`);
    return [{ id: 'lead-1', name: 'Acme Corp', status: 'new' }];
  }
}
