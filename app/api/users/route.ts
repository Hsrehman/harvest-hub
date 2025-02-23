import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';
import { userSchema } from '@/app/lib/user-registration/validation';
import zxcvbn from 'zxcvbn';
import validator from 'validator';
import { sendVerificationEmail } from '@/app/lib/user-registration/verificationEmail';
import { verifyRecaptcha } from '@/app/lib/user-registration/recaptcha';
import pino from 'pino';
import { createClient } from 'redis';
import { validateEmail, validatePassword, calculatePasswordStrength } from '@/app/lib/user-registration/validation';

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        return new Error('Max retries reached');
      }
      return Math.min(retries * 50, 500);
    }
  }
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.on('connect', () => {
  logger.info('Redis Client Connected');
});

const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
  return redisClient;
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    const redis = await connectRedis();
    
    const rateLimitKey = `rate-limit:${ip}`;
    const rateLimitCount = await redis.get(rateLimitKey);
    const currentCount = rateLimitCount ? parseInt(rateLimitCount, 10) : 0;

    if (currentCount >= 5) {
      logger.warn({ ip }, 'Rate limit exceeded');
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const body = await req.json();

    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken) {
      logger.warn({ ip }, 'CSRF token missing');
      return NextResponse.json({ error: 'CSRF token required' }, { status: 403 });
    }
    const storedCsrfToken = await redis.get(`csrf:${ip}`);
    if (storedCsrfToken !== csrfToken) {
      logger.warn({ ip }, 'Invalid CSRF token');
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const recaptchaToken = body.recaptchaToken;
    if (!recaptchaToken) {
      logger.warn({ ip }, 'reCAPTCHA token missing');
      return NextResponse.json({ error: 'reCAPTCHA token required' }, { status: 400 });
    }
    const recaptchaValid = await verifyRecaptcha(recaptchaToken);
    if (!recaptchaValid) {
      logger.warn({ ip }, 'reCAPTCHA verification failed');
      return NextResponse.json({ error: 'reCAPTCHA verification failed' }, { status: 400 });
    }

    const sanitizedBody = {
      ...body,
      email: validator.trim(body.email || ''),
      firstName: validator.trim(body.firstName || ''),
      lastName: validator.trim(body.lastName || ''),
      businessName: body.businessName ? validator.trim(body.businessName) : undefined,
      registrationNumber: body.registrationNumber ? validator.trim(body.registrationNumber) : undefined,
      phoneNumber: body.phoneNumber ? validator.trim(body.phoneNumber) : undefined,
    };

    const { value, error } = userSchema.validate(sanitizedBody, { abortEarly: false, stripUnknown: true });
    if (error) {
      logger.warn({ ip, error: error.details }, 'Validation failed');
      return NextResponse.json({ error: 'Validation failed', details: error.details.map(e => e.message) }, { status: 400 });
    }

    const { email, firstName, lastName, password, accountType, businessName, registrationNumber, businessDocument, phoneNumber, dateOfBirth } = value;

    if (!validateEmail(email)) {
      logger.warn({ ip, email }, 'Invalid email after sanitization');
      throw new Error('Invalid email address after sanitization');
    }

    if (!validatePassword(password)) {
      logger.warn({ ip, passwordScore: Object.values(calculatePasswordStrength(password)).filter(Boolean).length }, 'Weak password rejected');
      return NextResponse.json({ error: 'Password is too weak', details: 'Password must have 8+ chars, uppercase, number, and special character' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const query = `
      INSERT INTO customer_data (
        id, email, first_name, last_name, password_hash, account_type,
        business_name, registration_number, business_document_url, phone_number, date_of_birth, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    const values = [id, email, firstName, lastName, passwordHash, accountType, businessName || null, registrationNumber || null, businessDocument || null, phoneNumber || null, dateOfBirth || null, false];

    const result = await pool.query(query, values);

    await sendVerificationEmail({ email, userId: result.rows[0].id });

    await redis.setEx(rateLimitKey, 300, (currentCount + 1).toString());

    logger.info({ userId: id, ip }, 'Registration successful');
    return NextResponse.json({ message: 'Customer registered successfully. Please verify your email.', userId: result.rows[0].id }, { status: 201 });
  } catch (error: any) {
    logger.error({ error: error.message || error, ip }, 'Registration failed');
    if (error.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error', details: error.message || 'Unknown error' }, { status: 500 });
  }
}