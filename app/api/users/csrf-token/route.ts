import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(err => logger.error({ err }, 'Redis connection failed'));

export async function GET() {
  const ip = '127.0.0.1'; // Use actual IP in production (req.headers.get('x-forwarded-for') || 'unknown')
  const csrfToken = uuidv4();
  await redisClient.setEx(`csrf:${ip}`, 300, csrfToken); // Expires in 5 minutes
  logger.info({ ip }, 'CSRF token generated');
  return NextResponse.json({ token: csrfToken }, { status: 200 });
}