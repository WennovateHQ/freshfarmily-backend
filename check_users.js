/**
 * Script to check the Users table structure and data
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { QueryTypes } = require('sequelize');

async function checkUsersTable() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    
    // Check Users table structure
    console.log('\n--- Users Table Structure ---');
    const tableInfo = await sequelize.query(
      `SELECT column_name, data_type, character_maximum_length, column_default, is_nullable 
       FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name = 'Users'`,
      { type: QueryTypes.SELECT }
    );
    
    console.table(tableInfo);
    
    // Check Users table data
    console.log('\n--- Users Table Data ---');
    const users = await sequelize.query(
      `SELECT id, email, role, status, "emailVerified", "createdAt" FROM "Users"`,
      { type: QueryTypes.SELECT }
    );
    
    console.table(users);
    
    // Close the connection
    await sequelize.close();
    console.log('Database connection closed.');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the check
checkUsersTable();
