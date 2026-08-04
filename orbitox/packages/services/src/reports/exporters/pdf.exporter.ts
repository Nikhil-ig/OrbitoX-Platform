import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PdfExporter {
  private readonly logger = new Logger(PdfExporter.name);

  async export(data: any): Promise<Buffer> {
    this.logger.log('Exporting data to PDF');
    // Mock implementation
    return Buffer.from('mock pdf data');
  }
}
