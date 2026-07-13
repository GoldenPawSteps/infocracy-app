import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './db';
import { logger } from './logger';
import { createRedisPubSub } from './redis';
import { GovernanceService } from './services/governanceService';
import { LeaderboardService } from './services/leaderboardService';
import { MarketService } from './services/marketService';
import { createSocketLayer } from './socket';

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  const redisPubSub = await createRedisPubSub();

  const marketService = new MarketService(prisma);
  const leaderboardService = new LeaderboardService(prisma);
  const governanceService = new GovernanceService(prisma);

  const server = http.createServer();
  const { io, eventBus } = await createSocketLayer(server, redisPubSub);
  const app = createApp({
    marketService,
    leaderboardService,
    governanceService,
    eventBus,
  });

  server.removeAllListeners('request');
  server.on('request', app);

  server.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Infocracy backend listening');
  });

  const shutdown = async () => {
    logger.info('Shutting down backend');
    io.close();
    server.close();
    await Promise.allSettled([redisPubSub.close(), prisma.$disconnect()]);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(async (error) => {
  logger.fatal({ err: error }, 'Failed to start backend');
  await prisma.$disconnect();
  process.exit(1);
});
