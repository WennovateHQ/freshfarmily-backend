/**
 * Database configuration for the FreshFarmily backend
 * 
 * Sets up the Sequelize connection to PostgreSQL
 */

const { Sequelize, DataTypes } = require('sequelize');
const logger = require('../utils/logger');
require('dotenv').config();

// Extract database configuration from environment variables
const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD
} = process.env;

// Create Sequelize instance
let sequelize;

// Use PostgreSQL database
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
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');
    return true;
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    return false;
  }
}

// Test database connection
testConnection()
  .then(success => {
    if (!success) {
      logger.warn('Application will continue, but database functionality may be limited.');
    }
  });

module.exports = {
  sequelize,
  DataTypes,
  testConnection
};
