import { Module } from '@nestjs/common';
import { ContextService } from './context.service';
import { ContextResolver } from './context-resolver';
import { ContextRepository } from './context.repository';
import { ContextInterceptor } from './context.interceptor';
import { SecurityModule } from '../security';

@Module({
  imports: [SecurityModule],
  providers: [
    ContextService,
    ContextResolver,
    ContextRepository,
    ContextInterceptor,
  ],
  exports: [ContextService, ContextInterceptor],
})
export class ContextModule {}
