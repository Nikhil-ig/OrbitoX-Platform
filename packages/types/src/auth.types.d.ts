/**
 * @module @orbitox/types/auth
 * Core authentication and identity types
 */
export interface JwtPayload {
    sub: string;
    iat: number;
    exp: number;
    jti: string;
    ctx: string;
    tid: string;
    oid: string;
    scp: string[];
    mfa: boolean;
    ips: string;
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
//# sourceMappingURL=auth.types.d.ts.map