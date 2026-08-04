import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExcelExporter {
  private readonly logger = new Logger(ExcelExporter.name);

  async export(data: any): Promise<Buffer> {
    this.logger.log('Exporting data to Excel');
    // Mock implementation
    return Buffer.from('mock excel data');
  }
}
