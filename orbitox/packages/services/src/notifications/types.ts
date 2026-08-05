export type NotificationChannel = 'email' | 'sms' | 'in-app' | 'push';

export type NotificationUrgency = 'low' | 'normal' | 'high' | 'critical';

export interface SmartNotificationIntent {
  userId: string;
  contextId: string;
  template: string;
  variables: Record<string, any>;
  subjectTemplate?: string;
  urgency?: NotificationUrgency;
  // If not provided, it resolves via user preferences
  overrideChannels?: NotificationChannel[];
}

export interface UserCommunicationPreferences {
  userId: string;
  email: string | null;
  phone: string | null;
  pushToken: string | null;
  
  // User's configured channels for different urgencies
  channels: {
    critical: NotificationChannel[]; // e.g. ['sms', 'in-app']
    high: NotificationChannel[];     // e.g. ['push', 'email']
    normal: NotificationChannel[];   // e.g. ['in-app', 'email']
    low: NotificationChannel[];      // e.g. ['in-app']
  };
}
