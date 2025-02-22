import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';


export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  try {
    const query = 'SELECT COUNT(*) FROM user_data WHERE email = $1';
    const result = await pool.query(query, [email]);
    const count = parseInt(result.rows[0].count, 10);

    return NextResponse.json({
      available: count === 0,
      message: count > 0 ? 'Email already exists' : 'Email is available'
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Server error', details: message }, { status: 500 });
  }
}