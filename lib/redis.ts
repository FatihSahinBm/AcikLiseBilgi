import { Redis } from '@upstash/redis';

// Define a type interface for the Redis client to support our mock fallback
export interface IRedisClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, options?: { ex?: number }): Promise<'OK' | null>;
  hset(key: string, value: Record<string, any>): Promise<number>;
  hgetall<T>(key: string): Promise<T | null>;
}

class InMemoryMockRedis implements IRedisClient {
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const val = this.store.get(key);
    if (!val) return null;
    try {
      return JSON.parse(val) as T;
    } catch {
      return val as unknown as T;
    }
  }

  async set(key: string, value: any, options?: { ex?: number }): Promise<'OK' | null> {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    this.store.set(key, stringValue);
    return 'OK';
  }

  async hset(key: string, value: Record<string, any>): Promise<number> {
    for (const [k, v] of Object.entries(value)) {
      this.store.set(`${key}:${k}`, typeof v === 'string' ? v : JSON.stringify(v));
    }
    return Object.keys(value).length;
  }

  async hgetall<T>(key: string): Promise<T | null> {
    const result: Record<string, any> = {};
    let found = false;
    for (const [k, v] of this.store.entries()) {
      if (k.startsWith(`${key}:`)) {
        found = true;
        const subKey = k.substring(key.length + 1);
        try {
          result[subKey] = JSON.parse(v);
        } catch {
          result[subKey] = v;
        }
      }
    }
    return found ? (result as T) : null;
  }
}

let redis: IRedisClient;

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (upstashUrl && upstashToken) {
  // Production Upstash Redis instance
  redis = new Redis({
    url: upstashUrl,
    token: upstashToken,
  }) as unknown as IRedisClient;
  console.log('Redis initialized: Using Upstash production Redis.');
} else {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CRITICAL ERROR: Upstash Redis environment variables (UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN) are missing in production!'
    );
  }
  
  // Development Mock instance
  console.log('Redis initialized: Upstash keys missing, using In-Memory Mock Redis.');
  
  // To ensure the mock persists across hot-reloads in development, attach to global
  const globalRef = global as unknown as { mockRedisClient?: IRedisClient };
  if (!globalRef.mockRedisClient) {
    globalRef.mockRedisClient = new InMemoryMockRedis();
  }
  redis = globalRef.mockRedisClient;
}

export { redis };
