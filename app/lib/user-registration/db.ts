import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.NEON_POSTGRESQL_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;