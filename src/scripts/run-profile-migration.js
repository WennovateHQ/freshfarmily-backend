/**
 * Custom migration script for creating the Profiles table
 * This script uses the existing database connection instead of Sequelize CLI
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

async function createProfilesTable() {
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    logger.info('Starting creation of Profiles table...');
    
    // Check if table already exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const profileTableExists = tables.some(t => t.table_name === 'profiles');
    if (profileTableExists) {
      logger.info('Profiles table already exists, skipping creation');
      return;
    }
    
    // Create Profiles table
    await queryInterface.createTable('Profiles', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true
      },
      zipCode: {
        type: DataTypes.STRING,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      bio: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      profileImage: {
        type: DataTypes.STRING,
        allowNull: true
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
    await queryInterface.addIndex('Profiles', ['userId'], {
      unique: true,
      name: 'profiles_userId_unique'
    });
    
    logger.info('Profiles table created successfully');
  } catch (error) {
    logger.error(`Error creating Profiles table: ${error.message}`);
    throw error;
  }
}

// Run the migration
createProfilesTable()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    logger.error(`Migration failed: ${error.message}`);
    process.exit(1);
  });
