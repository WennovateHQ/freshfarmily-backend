/**
 * PostgreSQL Database Setup Script for FreshFarmily
 * 
 * This script creates the database and user, then seeds test data.
 */

require('dotenv').config();
const { Client } = require('pg');
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');
const fs = require('fs');
const path = require('path');

// Generate the SQL setup script
function generateSetupScript() {
  const sqlPath = path.join(__dirname, 'freshfarmily_setup.sql');
  const sql = `-- SQL script to set up PostgreSQL for FreshFarmily

-- Create database if it doesn't exist
CREATE DATABASE ${process.env.DB_NAME};

-- Create user with password
CREATE USER ${process.env.DB_USER} WITH ENCRYPTED PASSWORD '${process.env.DB_PASSWORD}';

-- Grant privileges to the user on the database
GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB_NAME} TO ${process.env.DB_USER};

-- Connect to the freshfarmily database to grant additional privileges
\\c ${process.env.DB_NAME}

-- Grant privileges on all tables (current and future) to the user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO ${process.env.DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO ${process.env.DB_USER};
GRANT ALL PRIVILEGES ON SCHEMA public TO ${process.env.DB_USER};

-- Make the user the owner of the public schema
ALTER SCHEMA public OWNER TO ${process.env.DB_USER};`;

  fs.writeFileSync(sqlPath, sql);
  logger.info(`SQL setup script generated at: ${sqlPath}`);
  logger.info('\n======= INSTRUCTIONS FOR DATABASE SETUP =======');
  logger.info('1. Open pgAdmin 4');
  logger.info('2. Connect to your PostgreSQL server using your admin credentials');
  logger.info('3. Open Query Tool (right-click on your server, select Query Tool)');
  logger.info(`4. Open the SQL file at: ${sqlPath}`);
  logger.info('5. Run the script (F5 or the Run button)');
  logger.info('6. After successful execution, run: node seedDb.js');
  logger.info('=========================================\n');
}

// Generate the setup script
generateSetupScript();

// We can try to test if we can connect with the regular user credentials
async function testConnection() {
  try {
    // Test connection to the database with the user from the .env file
    const testClient = new Client({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    await testClient.connect();
    logger.info(`Successfully connected to PostgreSQL database '${process.env.DB_NAME}' with user '${process.env.DB_USER}'`);
    await testClient.end();
    return true;
  } catch (error) {
    // If we can't connect, that's expected - the database may not exist yet
    logger.info('Could not connect with the provided credentials. This is normal if you haven\'t created the database yet.');
    logger.info('Please follow the instructions above to set up the database.');
    return false;
  }
}

// Test the connection
testConnection();
