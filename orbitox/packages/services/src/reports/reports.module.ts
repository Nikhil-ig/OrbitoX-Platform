import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportBuilderService } from './report-builder.service';
import { PdfExporter } from './exporters/pdf.exporter';
import { CsvExporter } from './exporters/csv.exporter';
import { ExcelExporter } from './exporters/excel.exporter';

@Module({
  providers: [
    ReportService,
    ReportBuilderService,
    PdfExporter,
    CsvExporter,
    ExcelExporter,
  ],
  exports: [ReportService],
})
export class ReportsModule {}
