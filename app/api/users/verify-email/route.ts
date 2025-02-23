import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/app/lib/user-registration/db';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  if (!token) {
    logger.warn({ ip }, 'Token missing for email verification');
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; email: string };
    const { userId } = decoded;

    const query = 'UPDATE customer_data SET email_verified = TRUE WHERE id = $1 RETURNING id';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      logger.warn({ ip, userId }, 'Invalid or expired token');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    logger.info({ userId, ip }, 'Email verified');
    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (error) {
    logger.error({ error, ip }, 'Email verification failed');
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }
}