import { Module } from '@nestjs/common';
import { GdprComplianceService } from './gdpr.service';

@Module({
  providers: [GdprComplianceService],
  exports: [GdprComplianceService],
})
export class ComplianceModule {}
