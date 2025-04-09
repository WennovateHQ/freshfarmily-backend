/**
 * FreshFarmily Database Creation Script
 * 
 * This script creates a fresh database for the FreshFarmily application.
 */

const { Client } = require('pg');
require('dotenv').config();

// Get PostgreSQL connection info from .env
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'admin';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const NEW_DB_NAME = process.env.DB_NAME || 'freshfarmily_db';

async function createDatabase() {
  // Connect to default postgres database to create our new database
  const client = new Client({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: 'postgres' // Connect to default postgres database
  });

  try {
    console.log(`Connecting to PostgreSQL with user: ${DB_USER} on ${DB_HOST}:${DB_PORT}`);
    await client.connect();
    console.log('Connected to PostgreSQL successfully');

    // Check if database already exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, [NEW_DB_NAME]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Database ${NEW_DB_NAME} already exists`);
      
      // Drop the database if --force flag is provided
      if (process.argv.includes('--force')) {
        console.log(`Forcing database recreation. Dropping existing database ${NEW_DB_NAME}...`);
        
        // First, terminate all connections to the database
        await client.query(`
          SELECT pg_terminate_backend(pg_stat_activity.pid)
          FROM pg_stat_activity
          WHERE pg_stat_activity.datname = $1;
        `, [NEW_DB_NAME]);
        
        await client.query(`DROP DATABASE "${NEW_DB_NAME}"`);
        console.log(`Existing database ${NEW_DB_NAME} dropped successfully`);
        
        // Create the database
        await client.query(`CREATE DATABASE "${NEW_DB_NAME}"`);
        console.log(`Database ${NEW_DB_NAME} created successfully`);
      } else {
        console.log('Use --force flag to drop and recreate the database');
      }
    } else {
      // Create the database
      await client.query(`CREATE DATABASE "${NEW_DB_NAME}"`);
      console.log(`Database ${NEW_DB_NAME} created successfully`);
    }
    
    console.log('\nYou can now run migrations with:');
    console.log('node scripts/test-migrations.js --run');
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

createDatabase();
