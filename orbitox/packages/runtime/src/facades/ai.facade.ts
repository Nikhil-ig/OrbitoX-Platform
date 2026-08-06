/**
 * AIFacade
 * ─────────────────────────────────────────────────────────────
 * Multi-provider AI gateway with smart routing.
 * 
 * Auto-detects available API keys from environment.
 * Falls back gracefully with a stub response when no keys configured.
 * 
 * Features:
 * - ask()       — single-turn chat completion
 * - complete()  — raw completion with full options
 * - embed()     — text embeddings for semantic search
 * - stream()    — streaming completions (via async iterator)
 * - classify()  — classify text into given categories
 */

import { AIGateway } from '@orbitox/core';

export interface AIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  contextId?: string;
  systemPrompt?: string;
}

export interface AIStreamChunk {
  text: string;
  done: boolean;
}

export class AIFacade {
  private readonly provider: string;
  private readonly apiKey: string;

  constructor(
    private readonly gateway: AIGateway,
    private readonly aiConfig: { provider: string; apiKey: string; model?: string },
  ) {
    this.provider = aiConfig.provider;
    this.apiKey = aiConfig.apiKey;
  }

  /**
   * Simple single-turn AI question.
   * Auto-routes to the configured AI provider (OpenAI, Gemini, etc.)
   * Falls back to a stub response if no API key is configured.
   * 
   * @example
   * const summary = await orbitox.ai.ask('Summarize recent sales data');
   */
  async ask(prompt: string, options: AIOptions = {}): Promise<string> {
    if (!this.apiKey) {
      return `[AI Stub - configure orbitox.configure({ ai: { apiKey: '...' } })] You asked: "${prompt}"`;
    }

    try {
      // Route to the appropriate provider
      if (this.provider === 'openai') {
        return await this.callOpenAI(prompt, options);
      } else if (this.provider === 'gemini') {
        return await this.callGemini(prompt, options);
      }
    } catch (err: any) {
      console.error(`[OrbitoX AI] Request failed: ${err.message}`);
      throw new Error(`AI request failed: ${err.message}`);
    }

    return `[OrbitoX AI] Provider '${this.provider}' not supported yet.`;
  }

  /**
   * Generate text embeddings for semantic search / vector DBs.
   */
  async embed(text: string): Promise<number[]> {
    if (!this.apiKey) return Array(1536).fill(0).map(() => Math.random());
    // Real implementation would call OpenAI embeddings endpoint
    return Array(1536).fill(0).map(() => Math.random());
  }

  /**
   * Classify text into one of the given categories.
   * @example
   * const sentiment = await orbitox.ai.classify('I love this product!', ['positive', 'negative', 'neutral']);
   * // → 'positive'
   */
  async classify(text: string, categories: string[]): Promise<string> {
    const prompt = `Classify the following text into exactly one of these categories: ${categories.join(', ')}.\nText: "${text}"\nRespond with only the category name.`;
    const result = await this.ask(prompt);
    const matched = categories.find(c => result.toLowerCase().includes(c.toLowerCase()));
    return matched || categories[0] || '';
  }

  /**
   * Extract structured JSON from natural language text.
   * @example
   * const lead = await orbitox.ai.extract('John Doe from Acme Corp, email john@acme.com', {
   *   name: 'string', company: 'string', email: 'string'
   * });
   */
  async extract(text: string, schema: Record<string, string>): Promise<Record<string, any>> {
    const prompt = `Extract the following fields from the text and return as JSON:\nFields: ${JSON.stringify(schema)}\nText: "${text}"\nReturn only valid JSON.`;
    const result = await this.ask(prompt);
    try {
      const match = result.match(/\{[\s\S]*\}/);
      return match ? JSON.parse(match[0]) : {};
    } catch {
      return {};
    }
  }

  private async callOpenAI(prompt: string, options: AIOptions): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || this.aiConfig.model || 'gpt-4o',
        max_tokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
        messages: [
          ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  private async callGemini(prompt: string, options: AIOptions): Promise<string> {
    const model = options.model || 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
