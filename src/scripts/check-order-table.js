/**
 * Check Order Table Script
 * 
 * This script examines the structure of the orders table and checks for the existence
 * of the subTotal column, with the option to add it if missing.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function checkOrderTable() {
  try {
    logger.info('Checking orders table structure');
    
    // Check table columns
    const [columns] = await sequelize.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `);
    
    logger.info(`Found ${columns.length} columns in orders table`);
    
    // List all column names
    const columnNames = columns.map(col => col.column_name);
    console.log('Column names in orders table:', columnNames);
    
    // Check if subTotal column exists
    const hasSubTotal = columnNames.includes('subTotal');
    const hasSubtotal = columnNames.includes('subtotal'); // Check for lowercase version too
    
    if (hasSubTotal) {
      logger.info('subTotal column already exists in orders table');
    } else if (hasSubtotal) {
      logger.info('subtotal column (lowercase) exists, but model is looking for camelCase subTotal');
    } else {
      logger.warn('No subTotal or subtotal column found in orders table');
      
      // Add the missing column if desired
      const response = process.argv[2] === '--fix';
      
      if (response) {
        logger.info('Adding subTotal column to orders table');
        await sequelize.query(`
          ALTER TABLE orders 
          ADD COLUMN "subTotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00
        `);
        logger.info('Successfully added subTotal column to orders table');
      } else {
        logger.info('To add the missing column, run this script with --fix parameter');
      }
    }
    
    // Check for similar issues with other amount columns
    const requiredColumns = ['totalAmount', 'taxAmount', 'deliveryFee', 'discountAmount'];
    for (const column of requiredColumns) {
      if (!columnNames.includes(column)) {
        logger.warn(`Column ${column} is missing from orders table`);
        if (process.argv[2] === '--fix') {
          logger.info(`Adding ${column} column to orders table`);
          await sequelize.query(`
            ALTER TABLE orders 
            ADD COLUMN "${column}" DECIMAL(10,2) NOT NULL DEFAULT 0.00
          `);
          logger.info(`Successfully added ${column} column to orders table`);
        }
      }
    }
    
    // Check for deliveryAddress column
    if (!columnNames.includes('deliveryAddress')) {
      logger.warn('deliveryAddress column is missing from orders table');
      
      // Check if there's a shippingAddress column we can use
      if (columnNames.includes('shippingAddress')) {
        logger.info('Found shippingAddress column that can be used');
        
        if (process.argv[2] === '--fix') {
          // Add deliveryAddress column
          logger.info('Adding deliveryAddress column and copying data from shippingAddress');
          await sequelize.query(`
            ALTER TABLE orders ADD COLUMN "deliveryAddress" TEXT;
            UPDATE orders SET "deliveryAddress" = "shippingAddress";
          `);
          logger.info('Successfully added deliveryAddress column with data from shippingAddress');
        }
      } else {
        // Just add the column if shippingAddress doesn't exist
        if (process.argv[2] === '--fix') {
          logger.info('Adding deliveryAddress column to orders table');
          await sequelize.query(`
            ALTER TABLE orders ADD COLUMN "deliveryAddress" TEXT
          `);
          logger.info('Successfully added deliveryAddress column to orders table');
        }
      }
    }
    
    // Also check for other address-related columns
    const addressColumns = ['deliveryCity', 'deliveryState', 'deliveryZipCode', 'deliveryInstructions'];
    for (const column of addressColumns) {
      if (!columnNames.includes(column)) {
        logger.warn(`Column ${column} is missing from orders table`);
        if (process.argv[2] === '--fix') {
          logger.info(`Adding ${column} column to orders table`);
          await sequelize.query(`
            ALTER TABLE orders ADD COLUMN "${column}" TEXT
          `);
          logger.info(`Successfully added ${column} column to orders table`);
        }
      }
    }
    
    // Check for other date columns
    if (!columnNames.includes('requestedDeliveryDate') && columnNames.includes('scheduledDeliveryDate')) {
      logger.warn('requestedDeliveryDate column is missing, but scheduledDeliveryDate exists');
      if (process.argv[2] === '--fix') {
        logger.info('Adding requestedDeliveryDate column and copying from scheduledDeliveryDate');
        await sequelize.query(`
          ALTER TABLE orders ADD COLUMN "requestedDeliveryDate" TIMESTAMP WITH TIME ZONE;
          UPDATE orders SET "requestedDeliveryDate" = "scheduledDeliveryDate";
        `);
        logger.info('Successfully added requestedDeliveryDate column');
      }
    } else if (!columnNames.includes('requestedDeliveryDate')) {
      logger.warn('requestedDeliveryDate column is missing from orders table');
      if (process.argv[2] === '--fix') {
        logger.info('Adding requestedDeliveryDate column to orders table');
        await sequelize.query(`
          ALTER TABLE orders ADD COLUMN "requestedDeliveryDate" TIMESTAMP WITH TIME ZONE
        `);
        logger.info('Successfully added requestedDeliveryDate column to orders table');
      }
    }
    
    // Check for scheduledDeliveryTime column
    if (!columnNames.includes('scheduledDeliveryTime') && columnNames.includes('scheduledDeliveryDate')) {
      logger.warn('scheduledDeliveryTime column is missing, but scheduledDeliveryDate exists');
      if (process.argv[2] === '--fix') {
        logger.info('Adding scheduledDeliveryTime column and copying from scheduledDeliveryDate');
        await sequelize.query(`
          ALTER TABLE orders ADD COLUMN "scheduledDeliveryTime" TIMESTAMP WITH TIME ZONE;
          UPDATE orders SET "scheduledDeliveryTime" = "scheduledDeliveryDate";
        `);
        logger.info('Successfully added scheduledDeliveryTime column');
      }
    } else if (!columnNames.includes('scheduledDeliveryTime')) {
      logger.warn('scheduledDeliveryTime column is missing from orders table');
      if (process.argv[2] === '--fix') {
        logger.info('Adding scheduledDeliveryTime column to orders table');
        await sequelize.query(`
          ALTER TABLE orders ADD COLUMN "scheduledDeliveryTime" TIMESTAMP WITH TIME ZONE
        `);
        logger.info('Successfully added scheduledDeliveryTime column to orders table');
      }
    }
    
    // Check for actualDeliveryTime column
    if (!columnNames.includes('actualDeliveryTime')) {
      logger.warn('actualDeliveryTime column is missing from orders table');
      if (process.argv[2] === '--fix') {
        logger.info('Adding actualDeliveryTime column to orders table');
        await sequelize.query(`
          ALTER TABLE orders ADD COLUMN "actualDeliveryTime" TIMESTAMP WITH TIME ZONE
        `);
        logger.info('Successfully added actualDeliveryTime column to orders table');
      }
    }
    
    // Check for other missing columns
    const additionalOrderColumns = [
      { name: 'paymentMethod', type: 'TEXT' },
      { name: 'paymentTransactionId', type: 'TEXT' },
      { name: 'paymentIntentId', type: 'TEXT' },
      { name: 'notes', type: 'TEXT' },
      { name: 'customerEmail', type: 'TEXT' },
      { name: 'customerPhone', type: 'TEXT' },
      { name: 'customerName', type: 'TEXT' },
      { name: 'deliveryAddressLine1', type: 'TEXT' },
      { name: 'deliveryAddressLine2', type: 'TEXT' },
      { name: 'freeDeliveryApplied', type: 'BOOLEAN', default: 'FALSE' },
      { name: 'freeDeliveryReason', type: 'TEXT' },
      { name: 'refundAmount', type: 'DECIMAL(10,2)', default: '0.00' },
      { name: 'refundReason', type: 'TEXT' },
      { name: 'cancelReason', type: 'TEXT' },
      { name: 'estimatedDeliveryDate', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'orderCompleteDate', type: 'TIMESTAMP WITH TIME ZONE' }
    ];
    
    for (const column of additionalOrderColumns) {
      if (!columnNames.includes(column.name)) {
        logger.warn(`Column ${column.name} is missing from orders table`);
        if (process.argv[2] === '--fix') {
          const defaultClause = column.default ? ` DEFAULT ${column.default}` : '';
          logger.info(`Adding ${column.name} column to orders table`);
          await sequelize.query(`
            ALTER TABLE orders ADD COLUMN "${column.name}" ${column.type}${defaultClause}
          `);
          logger.info(`Successfully added ${column.name} column to orders table`);
        }
      }
    }
    
    // Check for column types and fix them if needed
    if (columnNames.includes('paymentStatus') && process.argv[2] === '--fix') {
      logger.info('Checking payment status column type');
      try {
        // Add the enum if it doesn't exist
        await sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
              CREATE TYPE payment_status_enum AS ENUM('pending', 'processing', 'paid', 'failed', 'refunded');
            END IF;
          END
          $$;
        `);
        
        // Try to cast the column
        await sequelize.query(`
          ALTER TABLE orders 
          ALTER COLUMN "paymentStatus" TYPE payment_status_enum 
          USING "paymentStatus"::payment_status_enum;
        `);
        logger.info('Successfully updated paymentStatus column type');
      } catch (error) {
        logger.error(`Error updating paymentStatus column type: ${error.message}`);
      }
    }
    
  } catch (error) {
    logger.error(`Error checking orders table: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the check and fix if --fix parameter is provided
checkOrderTable();
