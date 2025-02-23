import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';
import { userSchema, validateEmail, validatePassword, calculatePasswordStrength } from '@/app/lib/user-registration/validation';
import pino from 'pino';
import jwt from 'jsonwebtoken';
import { sendVerificationEmail } from '@/app/lib/user-registration/verificationEmail';
import { generate2FASecret, verify2FAToken } from '@/app/lib/user-registration/2fa';
import { connectRedis } from '@/app/utils/user-registration/redis'; // Updated path
import { validateCsrfToken, logSuspiciousActivity } from '@/app/utils/user-registration/auth'; // Updated path

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

  try {
    const redis = await connectRedis();
    const body = await req.json();
    let inputEmail = body.email || '';

    // JWT Validation (for existing sessions, optional for registration)
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { email: string; userId?: string };
        if (decoded.email !== inputEmail) {
          logger.warn({ ip }, 'JWT email mismatch');
          return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
        }
      } catch (error) {
        logger.warn({ ip }, 'Invalid or expired JWT token');
        return NextResponse.json({ error: 'Invalid or expired authentication token' }, { status: 401 });
      }
    }

    // CSRF Validation
    const csrfToken = req.headers.get('x-csrf-token');
    if (!csrfToken) {
      logger.warn({ ip }, 'CSRF token missing');
      return NextResponse.json({ error: 'CSRF token required' }, { status: 403 });
    }
    if (!await validateCsrfToken(ip, csrfToken)) {
      logSuspiciousActivity(ip, 'Invalid CSRF token attempt');
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    // Validate Inputs
    const sanitizedBody = {
      ...body,
      email: inputEmail,
      firstName: body.firstName ? body.firstName.trim() : '',
      lastName: body.lastName ? body.lastName.trim() : '',
      businessName: body.businessName ? body.businessName.trim() : undefined,
      registrationNumber: body.registrationNumber ? body.registrationNumber.trim() : undefined,
      phoneNumber: body.phoneNumber ? body.phoneNumber.trim() : undefined,
    };

    try {
      const validatedData = await userSchema.validate(sanitizedBody, { stripUnknown: true });
      const { email: validatedEmail, firstName, lastName, password, accountType, businessName, registrationNumber, businessDocument, phoneNumber, dateOfBirth } = validatedData;
      
      if (!validateEmail(validatedEmail)) {
        logger.warn({ ip, validatedEmail }, 'Invalid email after sanitization');
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
      }

      if (!validatePassword(password)) {
        logger.warn({ ip, passwordScore: Object.values(calculatePasswordStrength(password)).filter(Boolean).length }, 'Weak password rejected');
        return NextResponse.json({ error: 'Password is too weak', details: 'Password must have 8+ chars, uppercase, number, and special character, and be strong (score >= 3)' }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const id = uuidv4();

      const query = `
        INSERT INTO customer_data (
          id, email, first_name, last_name, password_hash, account_type,
          business_name, registration_number, business_document_url, phone_number, date_of_birth, email_verified, two_factor_enabled, two_factor_secret
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `;
      const twoFactorEnabled = body.enable2FA === true; // Optional 2FA
      const twoFactorSecret = twoFactorEnabled ? (await generate2FASecret(id, redis)).base32 : null;
      const values = [id, validatedEmail, firstName, lastName, passwordHash, accountType, businessName || null, registrationNumber || null, businessDocument || null, phoneNumber || null, dateOfBirth || null, false, twoFactorEnabled, twoFactorSecret];

      const result = await pool.query(query, values);

      await sendVerificationEmail({ email: validatedEmail, userId: result.rows[0].id });

      const newJwt = jwt.sign({ email: validatedEmail, userId: result.rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '1h' });
      const refreshToken = jwt.sign({ email: validatedEmail, userId: result.rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '24h' });

      logger.info({ userId: id, ip }, 'Registration successful');
      return NextResponse.json({
        message: 'Customer registered successfully. Please verify your email.',
        userId: result.rows[0].id,
        jwtToken: newJwt,
        refreshToken,
        twoFactorEnabled,
        twoFactorSecret: twoFactorEnabled ? twoFactorSecret : undefined,
      }, { status: 201 });
    } catch (error: any) {
      logger.warn({ ip, error: error.message }, 'Validation failed');
      return NextResponse.json({ error: 'Validation failed', details: error.message || 'Unknown error' }, { status: 400 });
    }
  } catch (error: any) {
    logger.error({ error: error.message || error, ip }, 'Registration failed');
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal server error', details: error.message || 'Unknown error' }, { status: 500 });
  }
}