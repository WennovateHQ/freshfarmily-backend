/**
 * Check Table Schema
 * 
 * This script checks the schema of a specific table
 */

const { sequelize } = require('../src/config/database');
require('dotenv').config();

// Table to check - can be passed as command line argument
const tableName = process.argv[2] || 'farms';

async function checkTableSchema() {
  try {
    console.log(`Checking schema for table: ${tableName}`);
    
    // Query to get column information for the table
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = '${tableName}'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (columns.length === 0) {
      console.log(`Table '${tableName}' does not exist or has no columns.`);
    } else {
      console.log(`\nFound ${columns.length} columns in table '${tableName}':`);
      console.log('--------------------------------------------------');
      console.log('COLUMN NAME          | DATA TYPE       | NULLABLE | DEFAULT');
      console.log('--------------------------------------------------');
      columns.forEach(column => {
        const name = column.column_name.padEnd(20);
        const type = column.data_type.padEnd(16);
        const nullable = column.is_nullable.padEnd(9);
        const defaultVal = (column.column_default || '').substring(0, 30);
        console.log(`${name} | ${type} | ${nullable} | ${defaultVal}`);
      });
    }
  } catch (error) {
    console.error('Error checking table schema:', error);
  } finally {
    await sequelize.close();
  }
}

checkTableSchema();
