/**
 * Rename Database Tables Script
 * 
 * This script renames the tables from uppercase to lowercase
 * to ensure consistency across the application.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function renameTables() {
  try {
    logger.info('Starting table rename script...');

    // Check existing tables
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `);
    
    const existingTables = tables.map(t => t.tablename);
    logger.info(`Existing tables: ${existingTables.join(', ')}`);
    
    // Rename Users to users if it exists
    if (existingTables.includes('Users')) {
      try {
        // First check if lowercase users table exists
        if (existingTables.includes('users')) {
          logger.warn('Both "Users" and "users" tables exist. Will try to migrate data.');
          
          // If both exist, try to migrate data from Users to users
          await sequelize.query(`
            -- Copy data from Users to users
            INSERT INTO users 
            SELECT * FROM "Users"
            ON CONFLICT (id) DO NOTHING;
            
            -- Drop the uppercase table
            DROP TABLE "Users";
          `);
          logger.info('Successfully migrated data from "Users" to "users" and dropped the uppercase table');
        } else {
          // Simple rename if lowercase doesn't exist
          await sequelize.query(`ALTER TABLE "Users" RENAME TO users;`);
          logger.info('Renamed "Users" table to "users"');
        }
      } catch (error) {
        logger.error(`Error renaming Users table: ${error.message}`);
      }
    } else {
      logger.info('No "Users" table found, no renaming needed');
    }
    
    // Rename Profiles to profiles if it exists
    if (existingTables.includes('Profiles')) {
      try {
        // First check if lowercase profiles table exists
        if (existingTables.includes('profiles')) {
          logger.warn('Both "Profiles" and "profiles" tables exist. Will try to migrate data.');
          
          // If both exist, try to migrate data from Profiles to profiles
          await sequelize.query(`
            -- Copy data from Profiles to profiles
            INSERT INTO profiles 
            SELECT * FROM "Profiles"
            ON CONFLICT (id) DO NOTHING;
            
            -- Drop the uppercase table
            DROP TABLE "Profiles";
          `);
          logger.info('Successfully migrated data from "Profiles" to "profiles" and dropped the uppercase table');
        } else {
          // Simple rename if lowercase doesn't exist
          await sequelize.query(`ALTER TABLE "Profiles" RENAME TO profiles;`);
          logger.info('Renamed "Profiles" table to "profiles"');
        }
      } catch (error) {
        logger.error(`Error renaming Profiles table: ${error.message}`);
      }
    } else {
      logger.info('No "Profiles" table found, no renaming needed');
    }
    
    // Verify final table list
    const [finalTables] = await sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `);
    
    const finalTableList = finalTables.map(t => t.tablename);
    logger.info(`Final table list: ${finalTableList.join(', ')}`);
    
    logger.info('Table rename script completed successfully');
  } catch (error) {
    logger.error(`Error in table rename script: ${error.message}`);
    console.error(error);
  } finally {
    // Don't close the connection
    logger.info('Script completed.');
  }
}

// Run the script
renameTables();
