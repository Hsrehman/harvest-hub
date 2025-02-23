import { createClient } from 'redis';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 50, 500),
  },
});

redisClient.on('error', (err) => logger.error('Redis Error:', err));
redisClient.on('connect', () => logger.info('Redis Connected'));

export async function connectRedis() {
  if (!redisClient.isOpen) await redisClient.connect();
  return redisClient;
}