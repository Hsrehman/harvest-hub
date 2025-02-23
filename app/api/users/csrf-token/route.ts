import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(console.error);

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const token = randomUUID();
  await redisClient.set(`csrf:${ip}`, token, { EX: 3600 }); // 1-hour expiry
  return NextResponse.json({ token });
}