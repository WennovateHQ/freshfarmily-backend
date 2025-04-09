/**
 * Script to create the product_photos table
 * This addresses the "relation product_photos does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function createProductPhotosTable() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if product_photos table exists...');
    
    // Check if the table exists using a reliable method
    const tableExists = await new Promise((resolve) => {
      sequelize.query("SELECT to_regclass('public.product_photos')")
        .then(([results]) => {
          resolve(results[0].to_regclass !== null);
        })
        .catch(() => resolve(false));
    });
    
    if (tableExists) {
      logger.info('product_photos table already exists');
      return;
    }
    
    logger.info('Creating product_photos table...');
    
    // Create the product_photos table
    await queryInterface.createTable('product_photos', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false
      },
      caption: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isMain: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.fn('NOW')
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: sequelize.fn('NOW')
      }
    });
    
    // Add indexes
    await queryInterface.addIndex('product_photos', ['productId'], {
      name: 'product_photos_product_id_idx'
    });
    
    await queryInterface.addIndex('product_photos', ['isMain'], {
      name: 'product_photos_is_main_idx'
    });
    
    logger.info('product_photos table created successfully');
  } catch (error) {
    logger.error(`Error creating product_photos table: ${error.message}`);
    throw error;
  }
}

// Run the script
createProductPhotosTable()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
