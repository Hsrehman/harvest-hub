import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';
import pino from 'pino';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  if (!email) {
    logger.warn({ ip }, 'Email is required for check');
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const result = await pool.query('SELECT COUNT(*) FROM customer_data WHERE email = $1', [email]);
    const count = parseInt(result.rows[0].count, 10);
    logger.info({ ip, email }, 'Email availability checked');
    return NextResponse.json({ available: count === 0, message: count > 0 ? 'Email already exists' : 'Email is available' }, { status: 200 });
  } catch (error) {
    logger.error({ ip, email, error }, 'Error checking email availability');
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}