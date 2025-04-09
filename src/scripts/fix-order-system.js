/**
 * Fix Order System Database Script
 * 
 * This script fixes schema inconsistencies in the order and delivery tables
 * to ensure proper database-model alignment.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { Order, OrderItem, Delivery, DeliveryBatch, DeliveryTracking } = require('../models');

async function fixOrderSystem() {
  try {
    logger.info('Starting order system database fixes');
    
    // Get all tables and their columns
    const [tables] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('orders', 'order_items', 'deliveries', 'delivery_batches', 'delivery_trackings')
    `);
    
    const tableList = tables.map(t => t.table_name);
    logger.info(`Found ${tableList.length} order-related tables: ${tableList.join(', ')}`);
    
    // Fix orders table
    if (tableList.includes('orders')) {
      await fixTable(
        'orders',
        Order.rawAttributes,
        [
          // Add any specific columns that might be missing in orders
          { name: 'paymentIntentId', type: 'TEXT' },
          { name: 'paymentClientSecret', type: 'TEXT' },
          { name: 'stripeCustomerId', type: 'TEXT' },
          { name: 'customerName', type: 'TEXT' },
          { name: 'orderType', type: 'TEXT' },
          { name: 'deliveryAddressLine1', type: 'TEXT' },
          { name: 'deliveryAddressLine2', type: 'TEXT' },
          { name: 'deliveryZip', type: 'TEXT' },
          { name: 'giftMessage', type: 'TEXT' },
          { name: 'specialInstructions', type: 'TEXT' },
          { name: 'refundAmount', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'isFreeDelivery', type: 'BOOLEAN', default: 'FALSE' },
          { name: 'freeDeliveryReason', type: 'TEXT' }
        ]
      );
    }
    
    // Fix order_items table
    if (tableList.includes('order_items')) {
      await fixTable(
        'order_items',
        OrderItem.rawAttributes,
        [
          // Add any specific columns that might be missing in order_items
          { name: 'farmId', type: 'UUID' },
          { name: 'productName', type: 'TEXT' },
          { name: 'productImage', type: 'TEXT' },
          { name: 'price', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'discountedPrice', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'totalPrice', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'weight', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'weightUnit', type: 'TEXT' },
          { name: 'isTaxable', type: 'BOOLEAN', default: 'TRUE' },
          { name: 'taxAmount', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'refundAmount', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'isRefunded', type: 'BOOLEAN', default: 'FALSE' },
          { name: 'refundReason', type: 'TEXT' }
        ]
      );
    }
    
    // Fix deliveries table
    if (tableList.includes('deliveries')) {
      await fixTable(
        'deliveries',
        Delivery.rawAttributes,
        [
          // Add any specific columns that might be missing in deliveries
          { name: 'deliveryFee', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'isFreeDelivery', type: 'BOOLEAN', default: 'FALSE' },
          { name: 'estimatedArrivalTime', type: 'TIMESTAMP WITH TIME ZONE' },
          { name: 'deliveryNotes', type: 'TEXT' },
          { name: 'driverNotes', type: 'TEXT' },
          { name: 'contactPhone', type: 'TEXT' },
          { name: 'contactName', type: 'TEXT' },
          { name: 'deliveryAddressLine1', type: 'TEXT' },
          { name: 'deliveryAddressLine2', type: 'TEXT' },
          { name: 'deliveryDistance', type: 'DECIMAL(10,2)', default: '0.00' },
          { name: 'timeWindows', type: 'JSONB' }
        ]
      );
    }
    
    logger.info('Order system database fixes completed successfully');
    
  } catch (error) {
    logger.error(`Error fixing order system: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

async function fixTable(tableName, modelAttributes, additionalColumns) {
  logger.info(`Fixing table: ${tableName}`);
  
  // Get existing columns
  const [columns] = await sequelize.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = '${tableName}'
  `);
  
  const columnNames = columns.map(col => col.column_name);
  logger.info(`Found ${columnNames.length} columns in ${tableName}`);
  
  // Check model attributes against database columns
  for (const attrName in modelAttributes) {
    const attribute = modelAttributes[attrName];
    // Skip virtual fields
    if (attribute.type && attribute.type.key === 'VIRTUAL') {
      continue;
    }
    
    // Get the field name (Sequelize might use a different column name)
    const fieldName = attribute.field || attrName;
    
    if (!columnNames.includes(fieldName)) {
      try {
        const sqlType = getSQLType(attribute);
        const defaultValue = getDefaultSQL(attribute);
        const nullableSQL = attribute.allowNull === false ? ' NOT NULL' : '';
        
        logger.info(`Adding missing column ${fieldName} to ${tableName}`);
        
        const alterSQL = `
          ALTER TABLE "${tableName}" 
          ADD COLUMN "${fieldName}" ${sqlType}${defaultValue}${nullableSQL}
        `;
        
        await sequelize.query(alterSQL);
        logger.info(`Successfully added column ${fieldName} to ${tableName}`);
      } catch (error) {
        logger.error(`Error adding model column ${fieldName}: ${error.message}`);
      }
    }
  }
  
  // Add additional columns that might not be in the model but are needed
  for (const column of additionalColumns) {
    if (!columnNames.includes(column.name)) {
      try {
        const defaultClause = column.default ? ` DEFAULT ${column.default}` : '';
        const nullableSQL = column.notNull ? ' NOT NULL' : '';
        
        logger.info(`Adding extra column ${column.name} to ${tableName}`);
        
        const alterSQL = `
          ALTER TABLE "${tableName}" 
          ADD COLUMN "${column.name}" ${column.type}${defaultClause}${nullableSQL}
        `;
        
        await sequelize.query(alterSQL);
        logger.info(`Successfully added extra column ${column.name} to ${tableName}`);
      } catch (error) {
        logger.error(`Error adding extra column ${column.name}: ${error.message}`);
      }
    }
  }
}

// Helper function to get SQL type from Sequelize attribute
function getSQLType(attribute) {
  const type = attribute.type;
  
  if (!type) return 'TEXT';
  
  const typeKey = type.key || (type.constructor && type.constructor.key);
  
  switch (typeKey) {
    case 'STRING':
      return `VARCHAR(${type.options?.length || 255})`;
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
      return `DECIMAL(${type.options?.precision || 10},${type.options?.scale || 2})`;
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
      return 'TEXT'; // Using TEXT instead of ENUM for compatibility
    case 'JSON':
    case 'JSONB':
      return 'JSONB';
    case 'ARRAY':
      return `${getSQLType({ type: type.type })}[]`;
    default:
      return 'TEXT';
  }
}

// Helper function to get default SQL clause
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
  
  // Handle special Sequelize cases
  if (attribute.defaultValue && typeof attribute.defaultValue === 'object') {
    if (attribute.defaultValue.fn) {
      return ` DEFAULT ${attribute.defaultValue.fn}()`;
    }
    
    if (attribute.defaultValue.val) {
      return ` DEFAULT ${attribute.defaultValue.val}`;
    }
  }
  
  return '';
}

// Run the fix script
fixOrderSystem();
