/**
 * Database configuration for the FreshFarmily backend
 * 
 * Sets up the Sequelize connection to PostgreSQL
 */

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

// Extract database configuration from environment variables
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  TESTING
} = process.env;

// Create Sequelize instance
let sequelize;

// Always use PostgreSQL database even in testing mode
logger.info('Using PostgreSQL database');
sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// Test database connection
const testConnection = async () => {
  try {
    logger.info('Testing database connection...');
    logger.info(`Database: ${DB_NAME}, User: ${DB_USER}, Host: ${DB_HOST}`);
    await sequelize.authenticate();
    logger.info('✅ Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error(`❌ Unable to connect to the database: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      logger.error('Database connection failure in PRODUCTION environment!');
      process.exit(1); // Exit in production, database is critical
    }
    return false;
  }
};

// Test database connection
testConnection()
  .then(success => {
    if (!success && TESTING !== 'true') {
      logger.warn('Using in-memory mode due to database connection failure');
    }
  })
  .catch(err => {
    logger.error(`Unexpected error during database connection test: ${err.message}`);
  });

// Export the sequelize instance
module.exports = { 
  sequelize,
  testConnection
};
