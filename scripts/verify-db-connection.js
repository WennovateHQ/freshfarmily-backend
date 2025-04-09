/**
 * Database Connection Verification
 * 
 * This script verifies connection to the database and prints relevant information
 */

const { sequelize, testConnection } = require('../src/config/database');
const logger = require('../src/utils/logger');
require('dotenv').config();

async function verifyConnection() {
  try {
    const success = await testConnection();
    
    if (success) {
      console.log('✅ Successfully connected to the database');
      console.log(`Database: ${process.env.DB_NAME}`);
      console.log(`Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
      console.log(`User: ${process.env.DB_USER}`);
      
      // Check for tables in the database
      const [results] = await sequelize.query(`
        SELECT table_name, table_schema
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      
      if (results.length === 0) {
        console.log('\n⚠️ No tables found in the database. Migrations may not have been applied.');
      } else {
        console.log(`\nFound ${results.length} tables in the database:`);
        results.forEach(table => {
          console.log(`- ${table.table_name}`);
        });
      }
    } else {
      console.error('❌ Failed to connect to the database');
    }
  } catch (error) {
    console.error('❌ Error verifying database connection:', error);
  } finally {
    await sequelize.close();
  }
}

verifyConnection();
