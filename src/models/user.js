/**
 * User Model
 * 
 * Defines the user schema for the PostgreSQL database using Sequelize
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

// Define role-based permissions system
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'update', 'delete', 'admin'],
  farmer: ['read', 'write', 'update', 'delete_own'],
  driver: ['read', 'update_delivery'],
  consumer: ['read', 'create_order']
};

const User = sequelize.define('User', {
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
    defaultValue: JSON.stringify(['read']),
    get() {
      const rawValue = this.getDataValue('permissions');
      return rawValue ? JSON.parse(rawValue) : ['read'];
    },
    set(value) {
      this.setDataValue('permissions', JSON.stringify(Array.isArray(value) ? value : [value]));
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'pending', 'suspended', 'deleted'),
    defaultValue: 'pending',
    allowNull: false
  },
  // Add timestamps - these match Sequelize defaults
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'users',
  hooks: {
    // Hash the password before creating a new user
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    // Hash the password before updating if it's changed
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

// Add instance method to compare passwords
User.prototype.validatePassword = async function(password) {
  try {
    return await bcrypt.compare(password, this.password);
  } catch (error) {
    console.error('Error validating password:', error);
    return false;
  }
};

// Static method to get user with full profile
User.getUserWithProfile = async function(userId) {
  return await User.findByPk(userId, {
    attributes: { exclude: ['password'] },
    include: 'Profile'
  });
};

// Define Profile model
const Profile = sequelize.define('Profile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
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
  avatarUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  preferences: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'profiles'
});

// Export models - removing the associations from here as they are now defined in index.js
module.exports = { User, Profile, ROLE_PERMISSIONS };
