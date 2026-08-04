import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ReportBuilderService {
  private readonly logger = new Logger(ReportBuilderService.name);

  async buildData(reportConfig: any, contextId: string): Promise<any> {
    this.logger.log(`Building report data for context ${contextId}`);
    return { title: reportConfig.title || 'Untitled Report', data: [1, 2, 3] };
  }
}
