/**
 * Run Specific Migration
 * 
 * This script runs a specific migration file directly
 */

const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database connection parameters
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';

// Migration to run - command line argument or default to remove-pickup-fields
const migrationName = process.argv[2] || '20250401-remove-pickup-fields.js';

console.log(`Connecting to database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

// Create database connection
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: console.log
});

async function runMigration() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Load and run the migration
    console.log(`\nRunning migration: ${migrationName}`);
    const migrationPath = path.join(__dirname, '../src/migrations', migrationName);
    const migration = require(migrationPath);
    
    await migration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('\nMigration completed successfully!');
    
    // Record this migration in the SequelizeMeta table
    console.log('\nUpdating migration history...');
    await sequelize.query(
      'INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT (name) DO NOTHING',
      {
        replacements: { name: migrationName },
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    console.log(`Migration history updated - ${migrationName} is now tracked`);
    
  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
