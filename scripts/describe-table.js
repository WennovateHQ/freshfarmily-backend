/**
 * Describe Table Structure
 * 
 * This script describes the structure of a specific table using raw SQL
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database connection parameters
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Table to check - can be passed as command line argument
const tableName = process.argv[2] || 'farms';

async function describeTable() {
  const client = await pool.connect();
  
  try {
    console.log(`Describing table structure for: ${tableName}`);
    
    // Check if table exists
    const tableCheck = await client.query(`
      SELECT to_regclass('public.${tableName}') as table_exists;
    `);
    
    if (!tableCheck.rows[0].table_exists) {
      console.log(`Table '${tableName}' does not exist in the database.`);
      return;
    }
    
    // Get table columns
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable, 
        column_default
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' 
        AND table_name = $1
      ORDER BY 
        ordinal_position;
    `, [tableName]);
    
    if (result.rows.length === 0) {
      console.log(`No columns found for table '${tableName}'.`);
      return;
    }
    
    // Format and display results
    console.log('\nTable Structure:');
    console.log('--------------------------------------------------------------------');
    console.log('COLUMN NAME          | DATA TYPE          | NULLABLE | DEFAULT VALUE');
    console.log('--------------------------------------------------------------------');
    
    result.rows.forEach(row => {
      const column = row.column_name.padEnd(20);
      const dataType = row.data_type.padEnd(19);
      const nullable = row.is_nullable.padEnd(9);
      const defaultVal = (row.column_default || '').toString().substring(0, 30);
      
      console.log(`${column} | ${dataType} | ${nullable} | ${defaultVal}`);
    });
    
    console.log('--------------------------------------------------------------------');
    
  } catch (error) {
    console.error('Error describing table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

describeTable();
