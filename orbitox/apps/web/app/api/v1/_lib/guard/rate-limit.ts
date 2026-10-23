interface SlidingBucket {
  count: number;
  resetAt: number;
}

interface FailedAuthEntry {
  failures: number;
  lockedUntil: number;
  lastFailureAt: number;
}

const memoryRateLimitMap = new Map<string, SlidingBucket>();
const memoryFailedAuthMap = new Map<string, FailedAuthEntry>();

let redisClient: any = null;
let redisInitialized = false;

async function getRedisClient(): Promise<any> {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  if (process.env.REDIS_URL) {
    try {
      // Dynamic import to keep edge compatibility and optional dependency
      // @ts-ignore
      const ioredisPkg: any = await import('ioredis' as any).catch(() => null);
      if (ioredisPkg) {
        const Redis = ioredisPkg.Redis || ioredisPkg.default || ioredisPkg;
        redisClient = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 1,
          connectTimeout: 2000,
        });
        return redisClient;
      }
    } catch (err) {
      console.warn('⚠️ [SECURITY WARNING] Redis connection failed for rate limiting. Falling back to in-memory store.');
    }
  } else if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ [SECURITY WARNING] REDIS_URL is not configured in production. In-memory rate limiting is ephemeral across serverless/multi-instance deployments.');
  }

  return null;
}

/**
 * Checks standard sliding window rate limit for an authenticated key or public IP.
 */
export async function checkRateLimit(
  key: string,
  limitPerMin: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const redis = await getRedisClient();

  if (redis) {
    try {
      const redisKey = `ratelimit:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      const ttl = await redis.pttl(redisKey);
      const remaining = Math.max(0, limitPerMin - count);
      return {
        allowed: count <= limitPerMin,
        remaining,
        resetAt: now + (ttl > 0 ? ttl : windowMs),
      };
    } catch {
      // Fallback to memory if Redis error
    }
  }

  // In-memory sliding window
  const bucket = memoryRateLimitMap.get(key);
  if (!bucket || now >= bucket.resetAt) {
    memoryRateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limitPerMin - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  const allowed = bucket.count <= limitPerMin;
  const remaining = Math.max(0, limitPerMin - bucket.count);
  return { allowed, remaining, resetAt: bucket.resetAt };
}

/**
 * Strict rate limiting for failed authentication attempts (brute force protection).
 * Limit: 10 failed attempts per minute per IP.
 * Consecutive violations trigger exponential backoff.
 */
export async function checkFailedAuthLimit(
  clientIp: string
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const entry = memoryFailedAuthMap.get(clientIp);

  if (entry && entry.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/**
 * Records a failed authentication attempt for an IP address.
 */
export async function recordFailedAuth(clientIp: string): Promise<void> {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entry = memoryFailedAuthMap.get(clientIp) || {
    failures: 0,
    lockedUntil: 0,
    lastFailureAt: now,
  };

  // Reset failure count if past window
  if (now - entry.lastFailureAt > windowMs) {
    entry.failures = 1;
  } else {
    entry.failures += 1;
  }

  entry.lastFailureAt = now;

  // Stricter bucket: 10 failures / min triggers lockout with exponential backoff
  if (entry.failures >= 10) {
    const multiplier = Math.min(entry.failures - 9, 6); // Up to 6x (approx 15 mins)
    const lockoutDurationMs = 60 * 1000 * Math.pow(2, multiplier - 1);
    entry.lockedUntil = now + lockoutDurationMs;
  }

  memoryFailedAuthMap.set(clientIp, entry);
}

/**
 * Resets failed auth counter on successful authentication.
 */
export function resetFailedAuth(clientIp: string): void {
  memoryFailedAuthMap.delete(clientIp);
}
