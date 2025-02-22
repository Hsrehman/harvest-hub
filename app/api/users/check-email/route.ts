import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

  try {
    const result = await pool.query('SELECT COUNT(*) FROM customer_data WHERE email = $1', [email]);
    const count = parseInt(result.rows[0].count, 10);
    return NextResponse.json({ available: count === 0, message: count > 0 ? 'Email already exists' : 'Email is available' }, { status: 200 });
  } catch (error) {
    console.error('GET /api/users/check-email error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}