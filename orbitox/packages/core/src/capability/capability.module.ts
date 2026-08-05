import { Module, Global } from '@nestjs/common';
import { CapabilityEngine } from './capability.engine';

@Global()
@Module({
  providers: [CapabilityEngine],
  exports: [CapabilityEngine],
})
export class CapabilityModule {}
