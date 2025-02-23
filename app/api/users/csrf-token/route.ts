import { NextRequest, NextResponse } from 'next/server';
import { generateCsrfToken, logSuspiciousActivity } from '@/app/utils/user-registration/auth';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    const csrfToken = await generateCsrfToken(ip);
    return NextResponse.json({ token: csrfToken }, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error) {
    logSuspiciousActivity(ip, 'Failed to generate CSRF token');
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' }, 
      { status: 500 }
    );
  }
}