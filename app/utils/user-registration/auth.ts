import { createClient, RedisClientType } from 'redis'; // Updated import
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => logger.error('Redis Error:', err));
redisClient.on('connect', () => logger.info('Redis Connected'));

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient.isOpen) await redisClient.connect();
  return redisClient as RedisClientType; // Cast to ensure type compatibility
}

export async function generateCsrfToken(ip: string): Promise<string> {
  const token = uuidv4();
  const redis = await getRedisClient();
  await redis.setEx(`csrf:${ip}`, 300, token); // 5 minutes expiry
  return token;
}

export async function validateCsrfToken(ip: string, token: string): Promise<boolean> {
  const redis = await getRedisClient();
  const storedToken = await redis.get(`csrf:${ip}`);
  return storedToken === token;
}

export async function logSuspiciousActivity(ip: string, message: string) {
  logger.warn({ ip }, message);
}