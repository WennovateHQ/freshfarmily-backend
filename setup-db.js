/**
 * FreshFarmily Database Setup
 * 
 * This script creates the database user and initial schema on the RDS instance.
 * You'll need to run this with a user that has sufficient privileges (like the master user).
 */

require('dotenv').config();
const { Client } = require('pg');

// Master connection details (use the master user credentials from RDS console)
const masterClient = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default database first
  user: 'postgres',     // RDS default master username, change if you used a different one
  password: 'MASTER_PASSWORD_HERE', // Replace with your actual master password
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupDatabase() {
  try {
    console.log('Connecting to PostgreSQL as master user...');
    await masterClient.connect();
    console.log('Connected successfully.');

    // Step 1: Check if database exists, create if it doesn't
    console.log(`Checking if database "${process.env.DB_NAME}" exists...`);
    const dbCheckResult = await masterClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`, 
      [process.env.DB_NAME]
    );
    
    if (dbCheckResult.rows.length === 0) {
      console.log(`Creating database "${process.env.DB_NAME}"...`);
      await masterClient.query(`CREATE DATABASE "${process.env.DB_NAME}"`);
      console.log('Database created successfully.');
    } else {
      console.log(`Database "${process.env.DB_NAME}" already exists.`);
    }

    // Step 2: Check if user exists, create if it doesn't
    console.log(`Checking if user "${process.env.DB_USER}" exists...`);
    const userCheckResult = await masterClient.query(
      `SELECT 1 FROM pg_roles WHERE rolname = $1`, 
      [process.env.DB_USER]
    );
    
    if (userCheckResult.rows.length === 0) {
      console.log(`Creating user "${process.env.DB_USER}"...`);
      await masterClient.query(
        `CREATE USER "${process.env.DB_USER}" WITH ENCRYPTED PASSWORD $1`,
        [process.env.DB_PASSWORD]
      );
      console.log('User created successfully.');
    } else {
      console.log(`User "${process.env.DB_USER}" already exists. Updating password...`);
      await masterClient.query(
        `ALTER USER "${process.env.DB_USER}" WITH ENCRYPTED PASSWORD $1`,
        [process.env.DB_PASSWORD]
      );
      console.log('User password updated.');
    }

    // Step 3: Grant privileges to the user on the database
    console.log(`Granting privileges to "${process.env.DB_USER}" on "${process.env.DB_NAME}"...`);
    await masterClient.query(
      `GRANT ALL PRIVILEGES ON DATABASE "${process.env.DB_NAME}" TO "${process.env.DB_USER}"`
    );
    console.log('Privileges granted successfully.');

    console.log('\nDatabase setup completed successfully!');
    console.log('You should now be able to connect with the credentials in your .env file.');
  } catch (error) {
    console.error('Error setting up database:', error.message);
  } finally {
    await masterClient.end();
  }
}

setupDatabase();
