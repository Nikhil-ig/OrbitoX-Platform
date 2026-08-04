import { Injectable } from '@nestjs/common';
import { ElasticSearchAdapter } from './providers/elasticsearch.adapter';

@Injectable()
export class SearchService {
  constructor(private readonly elasticSearch: ElasticSearchAdapter) {}

  async index(entity: string, id: string, data: any, contextId: string): Promise<void> {
    const indexName = `context_${contextId}_${entity}`;
    await this.elasticSearch.indexDocument(indexName, id, data);
  }

  async search(entity: string, query: string, contextId: string, filters?: Record<string, any>): Promise<any[]> {
    const indexName = `context_${contextId}_${entity}`;
    return this.elasticSearch.search(indexName, query, filters);
  }

  async remove(entity: string, id: string, contextId: string): Promise<void> {
    const indexName = `context_${contextId}_${entity}`;
    await this.elasticSearch.deleteDocument(indexName, id);
  }
}
