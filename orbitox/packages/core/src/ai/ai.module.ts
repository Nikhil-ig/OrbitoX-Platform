import { Module, Global } from '@nestjs/common';
import { AIGateway } from './ai.gateway';
import { PromptLibrary } from './prompt.library';
import { ActionRegistry } from './action.registry';
import { CapabilityModule } from '../capability/capability.module';
import { AuditModule } from '../audit/audit.module';

@Global()
@Module({
  imports: [CapabilityModule, AuditModule],
  providers: [AIGateway, PromptLibrary, ActionRegistry],
  exports: [AIGateway, PromptLibrary, ActionRegistry],
})
export class AiModule {}
