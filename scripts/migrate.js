const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'radio_station',
  user: process.env.POSTGRES_USER || 'radio_user',
  password: process.env.POSTGRES_PASSWORD,
});

async function runMigrations() {
  console.log('Starting database migrations...');

  try {
    // Create migrations tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration file(s)`);

    for (const file of files) {
      // Check if migration has already been run
      const result = await pool.query(
        'SELECT id FROM migrations WHERE name = $1',
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`Running migration: ${file}`);

      // Read and execute migration
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [file]
        );
        await pool.query('COMMIT');
        console.log(`✓ Migration ${file} completed successfully`);
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
