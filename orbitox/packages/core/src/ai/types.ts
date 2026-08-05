import { CapabilityAdapter } from '../capability/types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface AgentConfig {
  tools: string[];
  maxSteps: number;
}

export interface AIGatewayRequest {
  contextId: string;
  pluginId: string;
  userId?: string;

  requestType: 'completion' | 'embedding' | 'classification' | 'extraction' | 'agent';
  model?: string;
  maxTokens?: number;
  temperature?: number;

  messages?: ChatMessage[];
  text?: string;
  agent?: AgentConfig;
}

export interface PromptDefinition {
  id: string;
  version: string;
  pluginId: string;
  description: string;
  template: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface AICapability extends CapabilityAdapter {
  complete(request: AIGatewayRequest): Promise<string>;
  embed(request: AIGatewayRequest): Promise<number[]>;
  chat(request: AIGatewayRequest): Promise<ChatMessage>;
}
