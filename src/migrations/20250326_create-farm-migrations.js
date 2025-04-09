/**
 * FreshFarmily Farm Schema Migration
 * Date: 2025-03-26
 * 
 * This combined migration creates the necessary tables for the Farm entity and the FarmPhoto model.
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating Farm and FarmPhoto tables');

  // Create farms table
  await queryInterface.createTable('farms', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    city: {
      type: DataTypes.STRING,
      allowNull: false
    },
    state: {
      type: DataTypes.STRING,
      allowNull: false
    },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    website: {
      type: DataTypes.STRING,
      allowNull: true
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'suspended', 'closed'),
      defaultValue: 'pending'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    certifications: {
      type: DataTypes.TEXT,
      defaultValue: JSON.stringify([]) // stored as JSON string
    },
    acceptsDelivery: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    deliveryRange: {
      type: DataTypes.FLOAT,
      defaultValue: 25
    },
    // ***** ADDED: farmerId column for linking farm to user *****
    farmerId: {
      type: DataTypes.UUID,
      allowNull: false, // adjust based on your requirements
      references: {
        model: 'Users', // Ensure this matches your users table name
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    // **********************************************************
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Create indexes for farms table
  await queryInterface.addIndex('farms', ['name']);
  await queryInterface.addIndex('farms', ['zipCode']);
  await queryInterface.addIndex('farms', {
    fields: ['isVerified', 'status']
  });

  // Create farm_photos table
  await queryInterface.createTable('farm_photos', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    farmId: {
      type: DataTypes.UUID,
      allowNull: false
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  console.log('Farm and FarmPhoto tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping Farm and FarmPhoto tables');

  await queryInterface.dropTable('farm_photos');
  await queryInterface.dropTable('farms');

  // Drop ENUM type for farms.status if using PostgreSQL
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_farms_status";');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
