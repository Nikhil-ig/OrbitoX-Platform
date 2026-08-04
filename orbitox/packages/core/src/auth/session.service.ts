import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { SessionInfo } from '@orbitox/types';

@Injectable()
export class SessionService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
  ) {}

  private getSessionKey(userId: string, sessionId: string): string {
    return `session:${userId}:${sessionId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `sessions:${userId}`;
  }

  async createSession(session: SessionInfo): Promise<void> {
    const key = this.getSessionKey(session.userId, session.sessionId);
    const setKey = this.getUserSessionsKey(session.userId);
    const ttlSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

    const multi = this.redis.multi();
    multi.set(key, JSON.stringify(session), 'EX', ttlSeconds);
    multi.sadd(setKey, session.sessionId);
    // Let the set member expire implicitly when the session expires,
    // though Redis sets don't support member TTL directly. We clean up on read.
    await multi.exec();
  }

  async getSession(userId: string, sessionId: string): Promise<SessionInfo | null> {
    const key = this.getSessionKey(userId, sessionId);
    const data = await this.redis.get(key);
    if (!data) {
      // Clean up orphaned session ID from set
      await this.redis.srem(this.getUserSessionsKey(userId), sessionId);
      return null;
    }
    return JSON.parse(data) as SessionInfo;
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const key = this.getSessionKey(userId, sessionId);
    const setKey = this.getUserSessionsKey(userId);
    
    await this.redis.pipeline()
      .del(key)
      .srem(setKey, sessionId)
      .exec();
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const setKey = this.getUserSessionsKey(userId);
    const sessionIds = await this.redis.smembers(setKey);
    
    if (sessionIds.length > 0) {
      const keys = sessionIds.map(id => this.getSessionKey(userId, id));
      await this.redis.pipeline()
        .del(...keys, setKey)
        .exec();
    }
  }

  async revokeToken(jti: string, expiresAt: Date): Promise<void> {
    const ttlSeconds = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
    if (ttlSeconds > 0) {
      await this.redis.set(`revoked_token:${jti}`, '1', 'EX', ttlSeconds);
    }
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`revoked_token:${jti}`);
    return exists === 1;
  }
}
