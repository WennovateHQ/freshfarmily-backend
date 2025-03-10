/**
 * Database connection check script for FreshFarmily
 * 
 * This script tests the connection to PostgreSQL and checks if the 
 * required database exists. If not, it creates it.
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { Client } = require('pg');

async function checkAndCreateDatabase() {
  console.log('Checking PostgreSQL connection and database...');
  
  // First, connect to postgres default database to check if our database exists
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres' // Connect to default database first
  });

  try {
    console.log('Connecting to PostgreSQL server...');
    await client.connect();
    console.log('Successfully connected to PostgreSQL server.');
    
    // Check if our database exists
    const res = await client.query(
      "SELECT datname FROM pg_database WHERE datname = $1", 
      [process.env.DB_NAME]
    );
    
    if (res.rowCount === 0) {
      console.log(`Database '${process.env.DB_NAME}' does not exist. Creating it now...`);
      // Create the database
      await client.query(`CREATE DATABASE ${process.env.DB_NAME}`);
      console.log(`Database '${process.env.DB_NAME}' created successfully.`);
    } else {
      console.log(`Database '${process.env.DB_NAME}' already exists.`);
    }
    
    // Now test connection to our specific database
    console.log(`Testing connection to '${process.env.DB_NAME}' database...`);
    const sequelize = new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: console.log
      }
    );
    
    await sequelize.authenticate();
    console.log('Database connection to FreshFarmily database established successfully.');
    
    return true;
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    return false;
  } finally {
    await client.end();
  }
}

// Run the function
checkAndCreateDatabase()
  .then(success => {
    if (success) {
      console.log('✅ PostgreSQL connection test complete.');
      process.exit(0);
    } else {
      console.log('❌ PostgreSQL connection test failed.');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
