/**
 * Connect to Default PostgreSQL Database
 * This script attempts to connect to the default 'postgres' database
 */

require('dotenv').config();
const { Client } = require('pg');

// Connection to default database
console.log('Attempting to connect to the default PostgreSQL database...');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: 'postgres', // Connect to default database
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => {
    console.log('✅ Successfully connected to default PostgreSQL database!');
    console.log('Now attempting to create the application database...');
    
    return client.query(`
      SELECT 1 FROM pg_database WHERE datname = $1
    `, [process.env.DB_NAME.replace('-', '_')]) // PostgreSQL typically replaces hyphens with underscores
      .then(result => {
        if (result.rows.length === 0) {
          console.log(`Database '${process.env.DB_NAME}' does not exist. Attempting to create it...`);
          return client.query(`CREATE DATABASE "${process.env.DB_NAME.replace('-', '_')}"`);
        } else {
          console.log(`Database '${process.env.DB_NAME}' already exists.`);
          return Promise.resolve();
        }
      });
  })
  .then(() => {
    console.log('Database operations completed successfully.');
    return client.end();
  })
  .catch(err => {
    console.error('Error:', err.message);
    client.end();
  });
