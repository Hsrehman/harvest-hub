import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';
import { userSchema } from '@/app/lib/user-registration/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { value, error } = userSchema.validate(body, { abortEarly: false, stripUnknown: true });
    if (error) return NextResponse.json({ error: 'Validation failed', details: error.details.map(e => e.message) }, { status: 400 });

    const { email, firstName, lastName, password, accountType, businessName, registrationNumber, businessDocument, phoneNumber, dateOfBirth } = value;
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    const query = `
      INSERT INTO customer_data (
        id, email, first_name, last_name, password_hash, account_type,
        business_name, registration_number, business_document_url, phone_number, date_of_birth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;
    const values = [id, email, firstName, lastName, passwordHash, accountType, businessName || null, registrationNumber || null, businessDocument || null, phoneNumber || null, dateOfBirth || null];

    const result = await pool.query(query, values);
    return NextResponse.json({ message: 'Customer registered successfully', userId: result.rows[0].id }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/users error:', error);
    if (error.code === '23505') return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    return NextResponse.json({ error: 'Internal server error', details: error.message || 'Unknown error' }, { status: 500 });
  }
}