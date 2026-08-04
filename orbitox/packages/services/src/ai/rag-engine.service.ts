import { Injectable, Logger } from '@nestjs/common';

export interface IndexDocumentPayload {
  contextId: string;
  collection: string;
  document: {
    id: string;
    title: string;
    content: string;
    metadata?: Record<string, any>;
  };
}

export interface RetrievalQuery {
  contextId: string;
  collection: string;
  query: string;
  topK?: number;
}

export interface RagResult {
  id: string;
  title: string;
  content: string;
  score: number;
}

@Injectable()
export class AiRagEngineService {
  private readonly logger = new Logger(AiRagEngineService.name);

  // Simulating an in-memory vector store isolated by contextId
  // Format: store[contextId][collection] = Array of documents
  private vectorStore: Record<string, Record<string, any[]>> = {};

  async indexDocument(payload: IndexDocumentPayload): Promise<void> {
    this.logger.log(`Indexing document [${payload.document.id}] in collection [${payload.collection}] for context [${payload.contextId}]`);
    
    const ctxStore = this.vectorStore[payload.contextId] || {};
    let collectionStore = ctxStore[payload.collection] || [];

    // Abstract chunking & embedding logic
    const chunkedRepresentation = {
      ...payload.document,
      embedding: [Math.random(), Math.random(), Math.random()], // mock vector
      indexedAt: new Date().toISOString()
    };

    // Remove existing if any
    collectionStore = collectionStore.filter(doc => doc.id !== payload.document.id);
    collectionStore.push(chunkedRepresentation);

    ctxStore[payload.collection] = collectionStore;
    this.vectorStore[payload.contextId] = ctxStore;
    this.logger.log(`Document successfully embedded and stored.`);
  }

  async similaritySearch(query: RetrievalQuery): Promise<RagResult[]> {
    this.logger.log(`Performing vector search in [${query.collection}] for query: "${query.query}"`);
    
    const ctxStore = this.vectorStore[query.contextId] || {};
    const documents = ctxStore[query.collection] || [];

    if (documents.length === 0) {
      this.logger.warn(`No knowledge base found for context [${query.contextId}] collection [${query.collection}]`);
      return [];
    }

    const topK = query.topK || 5;

    // Simulate cosine similarity sorting (just random scores for demo)
    const results: RagResult[] = documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      score: 0.5 + (Math.random() * 0.5) // Fake relevance score 0.5 - 1.0
    }));

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}
