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

  const publisher = createClient({ url: config.REDIS_URL });
  const subscriber = publisher.duplicate();

  publisher.on('error', (error) => logger.error({ err: error }, 'Redis publisher error'));
  subscriber.on('error', (error) => logger.error({ err: error }, 'Redis subscriber error'));

  await Promise.all([publisher.connect(), subscriber.connect()]);

  return {
    enabled: true,
    publisher,
    subscriber,
    close: async () => {
      await Promise.allSettled([publisher.quit(), subscriber.quit()]);
    },
  };
}
