import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class CsvExporter {
  private readonly logger = new Logger(CsvExporter.name);

  async export(data: any): Promise<Buffer> {
    this.logger.log('Exporting data to CSV');
    // Mock implementation
    return Buffer.from('mock,csv,data\n1,2,3');
  }
}
