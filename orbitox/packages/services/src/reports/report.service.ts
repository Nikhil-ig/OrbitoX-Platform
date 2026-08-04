import { Injectable, Logger } from '@nestjs/common';
import { ReportBuilderService } from './report-builder.service';
import { PdfExporter } from './exporters/pdf.exporter';
import { CsvExporter } from './exporters/csv.exporter';
import { ExcelExporter } from './exporters/excel.exporter';

export type ReportFormat = 'pdf' | 'csv' | 'excel';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(
    private readonly reportBuilder: ReportBuilderService,
    private readonly pdfExporter: PdfExporter,
    private readonly csvExporter: CsvExporter,
    private readonly excelExporter: ExcelExporter,
  ) {}

  async generateReport(reportConfig: any, format: ReportFormat, contextId: string): Promise<Buffer> {
    this.logger.log(`Generating ${format} report for context ${contextId}`);
    
    const data = await this.reportBuilder.buildData(reportConfig, contextId);

    switch (format) {
      case 'pdf': return this.pdfExporter.export(data);
      case 'csv': return this.csvExporter.export(data);
      case 'excel': return this.excelExporter.export(data);
      default: throw new Error(`Unsupported format: ${format}`);
    }
  }
}
