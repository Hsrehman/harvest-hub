import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 5;

export async function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/users')) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const key = `rate-limit:${ip}`;
    const count = await redisClient.get(key);
    const currentCount = count ? parseInt(count, 10) : 0;

    if (currentCount >= RATE_LIMIT_MAX) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    await redisClient.set(key, currentCount + 1, { PX: RATE_LIMIT_WINDOW });
    return NextResponse.next();
  }
  return NextResponse.next();
}

export const config = {
  matcher: '/api/users/:path*',
};