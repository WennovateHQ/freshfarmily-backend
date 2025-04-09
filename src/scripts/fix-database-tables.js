/**
 * Fix Database Tables Script
 *
 * This script synchronizes database tables with model definitions
 * and ensures all required tables exist with proper names.
 */

const { sequelize } = require('../config/database');
const { User, Profile } = require('../models/user');
const { Farm } = require('../models/farm');
const { Product } = require('../models/product');
const { Order } = require('../models/order');
const { Delivery } = require('../models/delivery');
const logger = require('../utils/logger');

async function fixDatabaseTables() {
  try {
    logger.info('Starting database table fix script...');

    // Check for existing tables 
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `);
    
    const existingTables = tables.map(t => t.tablename);
    logger.info(`Existing tables: ${existingTables.join(', ')}`);

    // Update model definitions to match actual database tables
    await fixUserModel();
    await fixOrderModel();
    
    logger.info('Database table fix script completed successfully');
  } catch (error) {
    logger.error(`Error fixing database tables: ${error.message}`);
    console.error(error);
  } finally {
    // Don't close the connection, let the app handle that
    logger.info('Database fix script completed.');
  }
}

async function fixUserModel() {
  try {
    // Update User model definition
    await sequelize.query(`
      -- Ensure the users table exists
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255),
        "lastName" VARCHAR(255),
        role VARCHAR(50) DEFAULT 'consumer',
        status VARCHAR(50) DEFAULT 'pending',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    
    logger.info('User model fixed successfully');
  } catch (error) {
    logger.error(`Error fixing User model: ${error.message}`);
  }
}

async function fixOrderModel() {
  try {
    // Check if the enum type exists
    const [enumTypes] = await sequelize.query(`
      SELECT typname FROM pg_type WHERE typname = 'enum_orders_status';
    `);
    
    // If the enum exists, try to add the 'confirmed' value
    if (enumTypes && enumTypes.length > 0) {
      try {
        // Check if 'confirmed' is already in the enum
        const [enumValues] = await sequelize.query(`
          SELECT e.enumlabel
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_orders_status';
        `);
        
        const existingValues = enumValues.map(v => v.enumlabel);
        logger.info(`Existing enum values: ${existingValues.join(', ')}`);
        
        if (!existingValues.includes('confirmed')) {
          await sequelize.query(`
            ALTER TYPE enum_orders_status ADD VALUE 'confirmed';
          `);
          logger.info('Added "confirmed" to order status enum');
        } else {
          logger.info('"confirmed" already exists in the enum');
        }
      } catch (err) {
        logger.error(`Error modifying enum: ${err.message}`);
      }
    } else {
      logger.warn('enum_orders_status does not exist. Cannot modify it.');
    }
    
    // Ensure the orders table is properly defined
    await sequelize.query(`
      -- Ensure the orders table exists with proper columns
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        status VARCHAR(50) DEFAULT 'pending',
        "orderNumber" VARCHAR(255) NOT NULL UNIQUE,
        "totalAmount" DECIMAL(10, 2) DEFAULT 0,
        "paymentStatus" VARCHAR(50) DEFAULT 'pending',
        "userId" UUID REFERENCES users(id),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    
    logger.info('Order model fixed successfully');
  } catch (error) {
    logger.error(`Error fixing Order model: ${error.message}`);
  }
}

// Run the script
fixDatabaseTables();
