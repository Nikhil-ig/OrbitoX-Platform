/**
 * @module @orbitox/types/auth
 * Core authentication and identity types
 */

export interface JwtPayload {
  sub: string;         // user ID
  iat: number;         // issued at
  exp: number;         // expires
  jti: string;         // JWT ID for revocation

  // Platform claims
  ctx: string;         // current context ID
  tid: string;         // tenant ID
  oid: string;         // organisation ID

  // Security
  scp: string[];       // scopes (for API keys)
  mfa: boolean;        // was MFA verified?
  ips: string;         // IP hash
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  contextId: string;
  deviceInfo: string;
  ipAddress: string;
  lastActive: Date;
  expiresAt: Date;
}

export interface MfaConfig {
  enabled: boolean;
  type: 'totp' | 'sms' | 'email';
  verified: boolean;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  contextId: string;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}
