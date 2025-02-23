import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.connect().catch(err => console.error('Redis connection error:', err));

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             '127.0.0.1';
             
  try {
    if (!redisClient.isOpen) {
      throw new Error('Redis connection not available');
    }
    const csrfToken = uuidv4();
    await redisClient.setEx(`csrf:${ip}`, 300, csrfToken); // 5 minutes expiry
    return NextResponse.json({ token: csrfToken }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('CSRF Token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' }, 
      { status: 500 }
    );
  }
}