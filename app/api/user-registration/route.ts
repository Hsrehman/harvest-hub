import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/app/lib/user-registration/db';
import { userSchema } from '@/app/lib/user-registration/validation';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate the request body against the schema
    const { value, error } = userSchema.validate(body, { abortEarly: false, stripUnknown: true });

    if (error) {
      console.error("Validation error:", error.details);
      return NextResponse.json({ errors: error.details }, { status: 400 });
    }

    const {
      email,
      firstName,
      lastName,
      password,
      accountType,
      businessName,
      registrationNumber,
      businessDocument,
      phoneNumber,
      dateOfBirth,
    } = value;

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate a unique ID for the user
    const id = uuidv4();

    // Insert the user data into the database
    const query = `
      INSERT INTO users (
        id,
        email,
        first_name,
        last_name,
        password_hash,
        account_type,
        business_name,
        registration_number,
        business_document_url,
        phone_number,
        date_of_birth
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    `;

    const values = [
      id,
      email,
      firstName,
      lastName,
      passwordHash,
      accountType,
      businessName,
      registrationNumber,
      businessDocument,
      phoneNumber,
      dateOfBirth,
    ];

    await pool.query(query, values);

    return NextResponse.json({ message: "User registered successfully" }, { status: 201 });
  } catch (e: any) {
    console.error("Registration error:", e);
    return NextResponse.json({ message: "Error registering user", error: e.message }, { status: 500 });
  }
}