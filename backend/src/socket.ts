import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './logger';
import type { SocketEventBus } from './types';
import type { RedisPubSub } from './redis';

export async function createSocketLayer(server: HttpServer, redisPubSub: RedisPubSub): Promise<{
  io: Server;
  eventBus: SocketEventBus;
}> {
  const io = new Server(server, {
    cors: {
      origin: config.corsOrigins,
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Socket connected');
  });

  if (redisPubSub.enabled && redisPubSub.subscriber) {
    await redisPubSub.subscriber.subscribe(config.socketChannel, async (message) => {
      const parsed = JSON.parse(message) as { event: string; payload: unknown };
      io.emit(parsed.event, parsed.payload);
    });
  }

  const eventBus: SocketEventBus = {
    emit: async (event, payload) => {
      if (redisPubSub.enabled && redisPubSub.publisher) {
        await redisPubSub.publisher.publish(config.socketChannel, JSON.stringify({ event, payload }));
        return;
      }
      io.emit(event, payload);
    },
  };

  return { io, eventBus };
}
