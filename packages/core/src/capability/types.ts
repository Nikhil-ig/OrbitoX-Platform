export interface Capability {
  id: string; // 'ai', 'notifications', 'payments'
  displayName: string; // 'AI Assistant'
  version: string; // '1.0.0'
  description: string;
  defaultProvider: string; // 'openai', 'sendgrid'
  configSchema?: any; // JSONSchema for the capability configuration
}

export interface CapabilityAdapter {
  providerId: string; // 'openai', 'anthropic', 'sendgrid', 'twilio'
  init(config: any): Promise<void>;
  // Additional abstract methods will be implemented by specific capability interfaces (e.g. AICapability)
}

export interface CapabilityConfig {
  provider: string;
  options: Record<string, any>;
}
