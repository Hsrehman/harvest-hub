import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '@/app/lib/user-registration/db';
import pino from 'pino';
import { connectRedis } from '@/app/utils/user-registration/redis'; // Updated path
import { verify2FAToken } from '@/app/lib/user-registration/2fa';
import { validateCsrfToken, logSuspiciousActivity } from '@/app/utils/user-registration/auth'; // Updated path

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

    const redis = await connectRedis();
    const query = 'SELECT * FROM customer_data WHERE id = $1';
    const result = await pool.query(query, [userId]);

    if (result.rows.length === 0) {
      logger.warn({ ip, userId }, 'Invalid or expired token');
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    const user = result.rows[0];
    if (user.email_verified) {
      logger.info({ userId, ip }, 'Email already verified');
      return NextResponse.json({ message: 'Email already verified' }, { status: 200 });
    }

    // Check 2FA if enabled
    if (user.two_factor_enabled) {
      const twoFAToken = searchParams.get('twoFAToken');
      if (!twoFAToken) {
        logger.warn({ ip, userId }, '2FA token required for verification');
        return NextResponse.json({ error: '2FA token required' }, { status: 401 });
      }
      if (!await verify2FAToken(userId, twoFAToken, redis)) {
        logger.warn({ ip, userId }, 'Invalid 2FA token');
        return NextResponse.json({ error: 'Invalid 2FA token' }, { status: 401 });
      }
    }

    await pool.query('UPDATE customer_data SET email_verified = TRUE WHERE id = $1', [userId]);
    logger.info({ userId, ip }, 'Email verified successfully');
    return NextResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  } catch (error) {
    logger.error({ error, ip }, 'Email verification failed');
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
  }
}