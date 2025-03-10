/**
 * User Model
 * 
 * Defines the user schema for the PostgreSQL database using Sequelize
 */

const { DataTypes } = require('sequelize');
const { sequelize, SQLiteTypes } = require('../config/database');
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
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  // Add hooks (lifecycle callbacks)
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    }
  },
  // Define instance methods
  instanceMethods: {
    // Method to validate password
    validatePassword(password) {
      return bcrypt.compare(password, this.password);
    }
  }
});

// Add instance method to compare passwords
User.prototype.validatePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

// Static method to get user with full profile
User.findByIdWithProfile = async function(id) {
  const user = await this.findByPk(id, {
    include: ['Profile']
  });
  return user;
};

// Define related models
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
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

// Define relationships
User.hasOne(Profile, {
  foreignKey: 'userId',
  as: 'Profile',
  onDelete: 'CASCADE'
});
Profile.belongsTo(User, {
  foreignKey: 'userId'
});

module.exports = { User, Profile, ROLE_PERMISSIONS };
