import { Injectable, Logger } from '@nestjs/common';

export interface MemoryContext {
  contextId: string;
  userId?: string;
  entityId: string;
  entityType: string;
}

export interface RememberPayload extends MemoryContext {
  fact: string;
}

export interface RecallResult {
  conversationHistory: { role: string; content: string; timestamp: string }[];
  entityFacts: string[];
}

@Injectable()
export class AiMemoryService {
  private readonly logger = new Logger(AiMemoryService.name);

  // In-memory persistent states
  // facts[contextId][entityType][entityId] = Array of facts
  private facts: Record<string, Record<string, Record<string, string[]>>> = {};

  // chatHistory[contextId][userId or 'global'] = Array of messages
  private chatHistory: Record<string, Record<string, any[]>> = {};

  async remember(payload: RememberPayload): Promise<void> {
    this.logger.log(`Storing fact for entity [${payload.entityType}:${payload.entityId}] in context [${payload.contextId}]`);
    
    const ctxFacts = this.facts[payload.contextId] || {};
    const typeFacts = ctxFacts[payload.entityType] || {};
    const entityFactsArr = typeFacts[payload.entityId] || [];

    entityFactsArr.push(payload.fact);

    typeFacts[payload.entityId] = entityFactsArr;
    ctxFacts[payload.entityType] = typeFacts;
    this.facts[payload.contextId] = ctxFacts;
  }

  async appendConversation(contextId: string, userId: string = 'global', role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    const ctxHistory = this.chatHistory[contextId] || {};
    const userHistory = ctxHistory[userId] || [];
    
    userHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });

    ctxHistory[userId] = userHistory;
    this.chatHistory[contextId] = ctxHistory;
  }

  async recall(context: MemoryContext, memoryTypes: ('conversation' | 'entity')[] = ['conversation', 'entity']): Promise<RecallResult> {
    const result: RecallResult = {
      conversationHistory: [],
      entityFacts: []
    };

    if (memoryTypes.includes('entity')) {
      const entityFacts = this.facts[context.contextId]?.[context.entityType]?.[context.entityId] || [];
      result.entityFacts = [...entityFacts];
      this.logger.log(`Recalled ${entityFacts.length} facts for [${context.entityType}:${context.entityId}]`);
    }

    if (memoryTypes.includes('conversation')) {
      const historyId = context.userId || 'global';
      const history = this.chatHistory[context.contextId]?.[historyId] || [];
      // Return last 20 messages to fit token window
      result.conversationHistory = history.slice(-20);
      this.logger.log(`Recalled ${result.conversationHistory.length} messages from history for [${historyId}]`);
    }

    return result;
  }
}
