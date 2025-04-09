/**
 * Script to add remaining columns to products table
 * This addresses all missing columns in the products table
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function addRemainingProductColumns() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking and adding missing columns to products table...');
    
    // Get existing columns
    const [existingColumns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'products'"
    );
    
    const columnNames = existingColumns.map(col => col.column_name);
    
    // Define columns to check and add if missing
    const columnsToAdd = [
      {
        name: 'isOrganic',
        definition: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
          allowNull: false
        }
      },
      {
        name: 'isAvailable',
        definition: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
          allowNull: false
        }
      },
      {
        name: 'imageUrl',
        definition: {
          type: DataTypes.STRING,
          allowNull: true
        }
      },
      {
        name: 'tags',
        definition: {
          type: DataTypes.JSONB,
          defaultValue: []
        }
      },
      {
        name: 'isFeatured',
        definition: {
          type: DataTypes.BOOLEAN,
          defaultValue: false
        }
      },
      {
        name: 'discountPercent',
        definition: {
          type: DataTypes.INTEGER,
          defaultValue: 0
        }
      },
      {
        name: 'minOrderQuantity',
        definition: {
          type: DataTypes.DECIMAL(10, 2),
          defaultValue: 0
        }
      },
      {
        name: 'maxOrderQuantity',
        definition: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: true
        }
      },
      {
        name: 'status',
        definition: {
          type: DataTypes.STRING(20), // Using STRING instead of ENUM for better compatibility
          defaultValue: 'active',
          allowNull: false
        }
      }
    ];
    
    // Add each missing column
    for (const column of columnsToAdd) {
      if (!columnNames.includes(column.name)) {
        logger.info(`Adding ${column.name} column to products table...`);
        await queryInterface.addColumn('products', column.name, column.definition);
        logger.info(`${column.name} column added successfully`);
      } else {
        logger.info(`${column.name} column already exists`);
      }
    }
    
    logger.info('All missing columns added to products table');
  } catch (error) {
    logger.error(`Error adding columns: ${error.message}`);
    throw error;
  }
}

// Run the script
addRemainingProductColumns()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
