import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { ElasticSearchAdapter } from './providers/elasticsearch.adapter';

@Module({
  providers: [SearchService, ElasticSearchAdapter],
  exports: [SearchService],
})
export class SearchModule {}
