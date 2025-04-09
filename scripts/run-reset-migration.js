/**
 * FreshFarmily Reset Migration Runner
 * 
 * This script directly runs the reset migration that creates all tables.
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

console.log(`Connecting to database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

// Create database connection
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: console.log
});

async function runResetMigration() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully');

    // Load and run the reset migration
    console.log('\nRunning reset migration to create all tables...');
    const resetMigrationPath = path.join(__dirname, '../src/migrations/20250401-reset-migrations.js');
    const resetMigration = require(resetMigrationPath);
    
    await resetMigration.up(sequelize.getQueryInterface(), Sequelize);
    console.log('\nReset migration completed successfully!');
    
    // Record this migration in the SequelizeMeta table
    console.log('\nUpdating migration history...');
    await sequelize.getQueryInterface().createTable('SequelizeMeta', {
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true
      }
    });
    
    await sequelize.query(
      'INSERT INTO "SequelizeMeta" (name) VALUES (:name)',
      {
        replacements: { name: '20250401-reset-migrations.js' },
        type: sequelize.QueryTypes.INSERT
      }
    );
    
    console.log('Migration history updated - reset migration is now tracked');
    console.log('\nDatabase is now ready to use with the FreshFarmily application!');
    
  } catch (error) {
    console.error('Error running reset migration:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runResetMigration();
