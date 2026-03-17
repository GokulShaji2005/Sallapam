import { createClient } from "redis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

// Extend the global type to cache the Redis client
declare global {
  // eslint-disable-next-line no-var
  var _redisClient: ReturnType<typeof createClient> | undefined;
}

let redisClient = global._redisClient;

if (!redisClient) {
  redisClient = createClient({ url: REDIS_URL });

  redisClient.on("error", (err) => {
    console.error("Redis client error:", err);
  });

  global._redisClient = redisClient;
}

export async function getRedisClient() {
  if (!redisClient!.isOpen) {
    await redisClient!.connect();
  }
  return redisClient!;
}

export { redisClient };
