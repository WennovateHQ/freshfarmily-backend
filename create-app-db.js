/**
 * Create Application Database Script
 * This script creates the FreshFarmily application database
 */

require('dotenv').config();
const { Client } = require('pg');

// Create the database name without hyphens (PostgreSQL doesn't like them in identifiers)
const dbNameSafe = process.env.DB_NAME.replace(/-/g, '_');

console.log(`Attempting to create database '${dbNameSafe}'...`);

// Connect to the default 'postgres' database
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Default database
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function createDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL successfully.');
    
    // Check if database already exists
    const checkResult = await client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [dbNameSafe]);
    
    if (checkResult.rows.length === 0) {
      console.log(`Creating database '${dbNameSafe}'...`);
      // Create the database
      await client.query(`CREATE DATABASE ${dbNameSafe}`);
      console.log(`Database '${dbNameSafe}' created successfully.`);
    } else {
      console.log(`Database '${dbNameSafe}' already exists.`);
    }

    // Update our .env file to use the safe database name 
    console.log(`Note: Update your .env file to use DB_NAME=${dbNameSafe} if necessary.`);

    // Now let's also create some basic tables for our FreshFarmily application
    console.log('\nSetup complete! Next steps:');
    console.log('1. Update your backend code to connect to the new database');
    console.log('2. Deploy your application to AWS App Runner using the guide');
    console.log('3. Run your database migrations when deploying');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

createDatabase();
