/**
 * Rename Database Tables Script (Improved)
 * 
 * This script handles the renaming of uppercase tables to lowercase
 * with a more reliable approach.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function renameTables() {
  try {
    logger.info('Starting improved table rename script...');

    // Check existing tables
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public';
    `);
    
    const existingTables = tables.map(t => t.tablename);
    logger.info(`Existing tables: ${existingTables.join(', ')}`);
    
    // Handle Users table
    if (existingTables.includes('Users')) {
      if (existingTables.includes('users')) {
        // Both exist, we'll drop the uppercase and keep lowercase
        logger.info('Both "Users" and "users" tables exist. Dropping uppercase table.');
        await sequelize.query(`DROP TABLE IF EXISTS "Users" CASCADE;`);
        logger.info('Dropped "Users" table');
      } else {
        // Only uppercase exists, rename it
        logger.info('Renaming "Users" to "users"');
        await sequelize.query(`ALTER TABLE IF EXISTS "Users" RENAME TO users;`);
        logger.info('Renamed "Users" table to "users"');
      }
    }
    
    // Handle Profiles table
    if (existingTables.includes('Profiles')) {
      if (existingTables.includes('profiles')) {
        // Both exist, drop the uppercase
        logger.info('Both "Profiles" and "profiles" tables exist. Dropping uppercase table.');
        await sequelize.query(`DROP TABLE IF EXISTS "Profiles" CASCADE;`);
        logger.info('Dropped "Profiles" table');
      } else {
        // Only uppercase exists, rename it
        logger.info('Renaming "Profiles" to "profiles"');
        await sequelize.query(`ALTER TABLE IF EXISTS "Profiles" RENAME TO profiles;`);
        logger.info('Renamed "Profiles" table to "profiles"');
      }
    }
    
    // Handle any other capitalized tables that should be lowercase
    const tablesNeedingRename = existingTables.filter(table => {
      // Check if the table has uppercase letters and is not SequelizeMeta
      return /[A-Z]/.test(table) && table !== 'SequelizeMeta';
    });
    
    for (const table of tablesNeedingRename) {
      const lowercaseTable = table.toLowerCase();
      
      if (existingTables.includes(lowercaseTable)) {
        // Lowercase already exists, drop the uppercase
        logger.info(`Both "${table}" and "${lowercaseTable}" tables exist. Dropping uppercase table.`);
        await sequelize.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
        logger.info(`Dropped "${table}" table`);
      } else {
        // Only uppercase exists, rename it
        logger.info(`Renaming "${table}" to "${lowercaseTable}"`);
        await sequelize.query(`ALTER TABLE IF EXISTS "${table}" RENAME TO ${lowercaseTable};`);
        logger.info(`Renamed "${table}" table to "${lowercaseTable}"`);
      }
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
