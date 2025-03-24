/**
 * Database Sync Script
 * 
 * This script will synchronize the database schema with the current model definitions
 * WARNING: This can result in data loss if not used carefully
 */

require('dotenv').config();
const { sequelize } = require('../config/database');
const { initializeModels } = require('../models/index');
const logger = require('../utils/logger');

async function syncDatabase() {
  try {
    // Initialize models
    initializeModels();
    
    logger.info('Starting database synchronization...');
    
    // Use alter: true to attempt to modify existing tables
    await sequelize.sync({ alter: true });
    
    logger.info('Database synchronization completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error(`Database synchronization failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the sync function
syncDatabase();
