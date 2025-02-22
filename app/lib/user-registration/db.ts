import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.NEON_POSTGRESQL_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function createUsersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        account_type VARCHAR(20) NOT NULL,
        business_name VARCHAR(255),
        registration_number VARCHAR(255),
        business_document_url VARCHAR(255),
        phone_number VARCHAR(20),
        date_of_birth DATE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('Users table created or already exists');
  } catch (error) {
    console.error('Error creating users table:', error);
  }
}

createUsersTable();

export default pool;