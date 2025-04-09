/**
 * FreshFarmily All Schema Migration
 * Date: 2025-03-26
 * 
 * This combined migration creates all necessary tables for the user.js model
 * User and Profile
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating User and Profile tables');

  // Create Users table
  await queryInterface.createTable('Users', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'farmer', 'driver', 'consumer'),
      defaultValue: 'consumer',
      allowNull: false
    },
    permissions: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: JSON.stringify(['read'])
    },
    status: {
      type: DataTypes.ENUM('active', 'pending', 'suspended', 'deleted'),
      defaultValue: 'pending',
      allowNull: false
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    stripeCustomerId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripeAccountId: {
      type: DataTypes.STRING,
      allowNull: true
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Establish relationship between User and Profile
  await queryInterface.addConstraint('Profiles', {
    fields: ['userId'],
    type: 'foreign key',
    name: 'FK_Profiles_User',
    references: {
      table: 'Users',
      field: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  });

  console.log('User and Profile tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping User and Profile tables');

  // Drop Profile table
  await queryInterface.dropTable('Profiles');
  
  // Drop User table
  await queryInterface.dropTable('Users');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
