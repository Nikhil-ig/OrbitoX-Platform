import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAfter: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
  }

  /**
   * Evaluates if a request is allowed based on the sliding window algorithm.
   *
   * @param key The unique identifier (e.g. 'ip:1.2.3.4', 'tenant:tenant-xyz')
   * @param limit Maximum number of requests allowed in the window
   * @param windowSeconds Duration of the window in seconds
   */
  async checkLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const redisKey = `ratelimit:${key}`;

    try {
      // We use a multi block to execute this transaction atomically
      const pipeline = this.redis.pipeline();
      
      // 1. Remove elements outside the window
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      
      // 2. Count elements in the window
      pipeline.zcard(redisKey);
      
      // 3. Add the current request
      pipeline.zadd(redisKey, now, `${now}-${uuidv4()}`);
      
      // 4. Set expiry on the set to clean up inactive keys
      pipeline.expire(redisKey, windowSeconds);

      const results = await pipeline.exec();
      
      if (!results || !results[1] || results[1][0]) {
        throw new Error('Pipeline execution failed or returned error');
      }

      // results[1] is the result of zcard
      const currentCount = results[1][1] as number;
      const allowed = currentCount < limit;
      
      if (!allowed) {
        // If not allowed, we shouldn't have added it, so we remove the newest entry
        await this.redis.zremrangebyscore(redisKey, now, now);
      }

      return {
        allowed,
        limit,
        remaining: allowed ? Math.max(0, limit - currentCount - 1) : 0,
        resetAfter: windowSeconds,
      };
    } catch (error: any) {
      this.logger.error(`Rate limit check failed for ${key}: ${error.message}`);
      // Fail-open: allow request if Redis fails (depending on security posture, could fail-close)
      return { allowed: true, limit, remaining: 1, resetAfter: windowSeconds };
    }
  }
}
