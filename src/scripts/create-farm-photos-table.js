/**
 * Script to create the farm_photos table
 * This addresses the "relation farm_photos does not exist" error
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function createFarmPhotosTable() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Checking if farm_photos table exists...');
    
    // Check if the table exists using a more reliable method
    const tableExists = await new Promise((resolve) => {
      sequelize.query("SELECT to_regclass('public.farm_photos')")
        .then(([results]) => {
          resolve(results[0].to_regclass !== null);
        })
        .catch(() => resolve(false));
    });
    
    if (tableExists) {
      logger.info('farm_photos table already exists');
      return;
    }
    
    logger.info('Creating farm_photos table...');
    
    // Create the farm_photos table
    await queryInterface.createTable('farm_photos', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      farmId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'farms',
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
    await queryInterface.addIndex('farm_photos', ['farmId'], {
      name: 'farm_photos_farm_id_idx'
    });
    
    logger.info('farm_photos table created successfully');
  } catch (error) {
    logger.error(`Error creating farm_photos table: ${error.message}`);
    throw error;
  }
}

// Run the script
createFarmPhotosTable()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
  });
