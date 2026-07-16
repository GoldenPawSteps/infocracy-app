import { createClient } from 'redis';
import { config } from './config';
import { logger } from './logger';

type RedisClient = ReturnType<typeof createClient>;

export interface RedisPubSub {
  enabled: boolean;
  publisher?: RedisClient;
  subscriber?: RedisClient;
  close: () => Promise<void>;
}

export async function createRedisPubSub(): Promise<RedisPubSub> {
  if (!config.REDIS_URL) {
    logger.warn('REDIS_URL not configured; socket pub/sub will run in local-only mode');
    return {
      enabled: false,
      close: async () => undefined,
    };
  }

  if (config.isProduction) {
    logger.warn('Redis pub/sub is disabled in production startup to avoid blocking service healthchecks');
    return {
      enabled: false,
      close: async () => undefined,
    };
  }

  const publisher = createClient({ url: config.REDIS_URL });
  const subscriber = publisher.duplicate();

  publisher.on('error', (error) => logger.error({ err: error }, 'Redis publisher error'));
  subscriber.on('error', (error) => logger.error({ err: error }, 'Redis subscriber error'));

  const connectWithTimeout = async (client: RedisClient, label: string) => {
    const timeoutMs = 10000;
    const timeout = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} connection timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    await Promise.race([client.connect(), timeout]);
  };

  try {
    await Promise.all([connectWithTimeout(publisher, 'Redis publisher'), connectWithTimeout(subscriber, 'Redis subscriber')]);
  } catch (error) {
    logger.warn({ err: error }, 'Redis pub/sub unavailable; socket pub/sub will run in local-only mode');
    publisher.removeAllListeners();
    subscriber.removeAllListeners();
    await Promise.allSettled([publisher.quit(), subscriber.quit()]);
    return {
      enabled: false,
      close: async () => undefined,
    };
  }

  return {
    enabled: true,
    publisher,
    subscriber,
    close: async () => {
      await Promise.allSettled([publisher.quit(), subscriber.quit()]);
    },
  };
}
