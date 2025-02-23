import { NextRequest, NextResponse } from 'next/server';
import { connectRedis } from '@/app/utils/user-registration/redis';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes in milliseconds
const RATE_LIMIT_MAX = 5; // Maximum requests per IP in 5 minutes
const FAILED_ATTEMPTS_LIMIT = 5; // Maximum failed attempts before lockout
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/users')) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const redis = await connectRedis();

    // Rate Limiting
    const rateLimitKey = `rate-limit:${ip}`;
    const rateLimitCount = await redis.get(rateLimitKey) || '0';
    const currentCount = parseInt(rateLimitCount, 10);

    if (currentCount >= RATE_LIMIT_MAX) {
      logger.warn({ ip }, 'Rate limit exceeded');
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Failed Attempts Lockout (for POST requests, e.g., registration or login attempts)
    if (req.method === 'POST') {
      const body = await req.json();
      const email = body.email || '';
      const failedAttemptsKey = `failed-attempts:${ip}:${email}`;
      const failedCount = await redis.get(failedAttemptsKey) || '0';
      const currentFailures = parseInt(failedCount, 10);

      if (currentFailures >= FAILED_ATTEMPTS_LIMIT) {
        logger.warn({ ip, email }, 'Account temporarily locked due to failed attempts');
        return NextResponse.json({ error: 'Too many failed attempts. Account locked for 15 minutes.' }, { status: 429 });
      }

      // Increment failed attempts on error (handled in routes if needed, but middleware can track)
      await redis.setEx(failedAttemptsKey, LOCKOUT_DURATION / 1000, (currentFailures + 1).toString());
    }

    // Increment rate limit
    await redis.setEx(rateLimitKey, RATE_LIMIT_WINDOW / 1000, (currentCount + 1).toString());

    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/users/:path*',
};