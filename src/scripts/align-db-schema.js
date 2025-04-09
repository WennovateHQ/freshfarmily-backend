/**
 * Database Schema Alignment Script
 * 
 * This script checks all Sequelize model definitions against actual database tables
 * and adds missing columns to ensure schema compatibility.
 */

const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Import all models
const models = require('../models');

async function getTableColumns(tableName) {
  const [columns] = await sequelize.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
    ORDER BY ordinal_position
  `);
  
  return columns;
}

async function alignDatabaseSchema() {
  try {
    logger.info('Starting database schema alignment');
    logger.info('Database connection has been established successfully');
    
    // Get list of all database tables
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    logger.info(`Found ${tables.length} tables in database`);
    
    // Use Sequelize's model definitions to identify missing columns
    for (const modelName in models) {
      // Skip non-model exports
      if (typeof models[modelName] !== 'object' || !models[modelName].tableName) {
        continue;
      }
      
      const model = models[modelName];
      const tableName = model.tableName;
      
      // Skip if we can't identify the table name
      if (!tableName) {
        logger.warn(`Could not determine table name for model ${modelName}`);
        continue;
      }
      
      logger.info(`Checking model ${modelName} against table ${tableName}`);
      
      // Get existing columns in the database
      const columns = await getTableColumns(tableName);
      if (!columns || columns.length === 0) {
        logger.warn(`Table ${tableName} not found in database`);
        continue;
      }
      
      const dbColumnNames = columns.map(col => col.column_name);
      
      // Check model attributes against database columns
      const modelAttributes = model.rawAttributes;
      const missingColumns = [];
      
      for (const attrName in modelAttributes) {
        const attribute = modelAttributes[attrName];
        // Skip Sequelize virtual fields
        if (attribute.type && attribute.type.key === 'VIRTUAL') {
          continue;
        }
        
        // Handle Sequelize's field mapping
        const fieldName = attribute.field || attrName;
        
        if (!dbColumnNames.includes(fieldName)) {
          missingColumns.push({
            modelName,
            tableName,
            columnName: fieldName,
            attribute
          });
        }
      }
      
      if (missingColumns.length > 0) {
        logger.warn(`Found ${missingColumns.length} missing columns in table ${tableName}`);
        
        // Add missing columns if --fix flag is set
        if (process.argv[2] === '--fix') {
          for (const missingCol of missingColumns) {
            try {
              const sqlType = getSQLType(missingCol.attribute);
              const defaultValue = getDefaultSQL(missingCol.attribute);
              const nullableSQL = missingCol.attribute.allowNull === false ? ' NOT NULL' : '';
              
              const alterSQL = `
                ALTER TABLE "${missingCol.tableName}" 
                ADD COLUMN "${missingCol.columnName}" ${sqlType}${defaultValue}${nullableSQL}
              `;
              
              logger.info(`Adding column ${missingCol.columnName} to table ${missingCol.tableName}`);
              logger.debug(`SQL: ${alterSQL}`);
              
              await sequelize.query(alterSQL);
              logger.info(`Successfully added column ${missingCol.columnName}`);
            } catch (error) {
              logger.error(`Error adding column ${missingCol.columnName}: ${error.message}`);
            }
          }
        } else {
          logger.info('To add missing columns, run this script with --fix parameter');
        }
      } else {
        logger.info(`All columns for ${modelName} exist in table ${tableName}`);
      }
    }
    
    logger.info('Schema alignment check complete');
    
  } catch (error) {
    logger.error(`Error aligning database schema: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Helper function to convert Sequelize type to SQL type
function getSQLType(attribute) {
  const type = attribute.type;
  
  if (!type) return 'TEXT';
  
  const typeKey = type.key || type.constructor.key;
  
  switch (typeKey) {
    case 'STRING':
      return `VARCHAR(${type.options.length || 255})`;
    case 'TEXT':
      return 'TEXT';
    case 'BOOLEAN':
      return 'BOOLEAN';
    case 'INTEGER':
      return 'INTEGER';
    case 'BIGINT':
      return 'BIGINT';
    case 'FLOAT':
      return 'DOUBLE PRECISION';
    case 'DOUBLE':
      return 'DOUBLE PRECISION';
    case 'DECIMAL':
      return `DECIMAL(${type.options.precision || 10},${type.options.scale || 2})`;
    case 'DATE':
    case 'DATEONLY':
      return 'DATE';
    case 'TIME':
      return 'TIME';
    case 'DATETIME':
    case 'TIMESTAMP':
      return 'TIMESTAMP WITH TIME ZONE';
    case 'UUID':
      return 'UUID';
    case 'ENUM':
      // ENUM handling is complex - ideally use PostgreSQL's enum type
      const values = type.values.map(val => `'${val}'`).join(', ');
      const enumType = `enum_${attribute.Model.tableName}_${attribute.field || attribute.fieldName}`;
      return enumType;
    case 'JSON':
    case 'JSONB':
      return 'JSONB';
    case 'ARRAY':
      return `${getSQLType({ type: type.type })}[]`;
    default:
      return 'TEXT';
  }
}

// Helper function to get default value SQL
function getDefaultSQL(attribute) {
  if (attribute.defaultValue === undefined) return '';
  
  if (attribute.defaultValue === null) return ' DEFAULT NULL';
  
  if (typeof attribute.defaultValue === 'string') {
    return ` DEFAULT '${attribute.defaultValue}'`;
  }
  
  if (typeof attribute.defaultValue === 'number') {
    return ` DEFAULT ${attribute.defaultValue}`;
  }
  
  if (typeof attribute.defaultValue === 'boolean') {
    return ` DEFAULT ${attribute.defaultValue ? 'TRUE' : 'FALSE'}`;
  }
  
  // Handle Sequelize.fn calls like NOW(), etc.
  if (attribute.defaultValue && attribute.defaultValue.fn) {
    return ` DEFAULT ${attribute.defaultValue.fn}()`;
  }
  
  // Handle Sequelize.literal
  if (attribute.defaultValue && attribute.defaultValue.val) {
    return ` DEFAULT ${attribute.defaultValue.val}`;
  }
  
  return '';
}

// Run the alignment
alignDatabaseSchema();
