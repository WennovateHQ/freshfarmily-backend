/**
 * Farm Model
 * 
 * Defines the farm entity and related product models for the FreshFarmily system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Farm model definition
const Farm = sequelize.define('Farm', {
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
    allowNull: false,
    // The field in the model is 'state' but the frontend sends 'province'
    // Don't map to a different column name
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
    allowNull: true,
    validate: {
      isEmail: true
    }
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
    defaultValue: false,
    allowNull: false
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
    defaultValue: JSON.stringify([]),
    get() {
      const rawValue = this.getDataValue('certifications');
      return rawValue ? JSON.parse(rawValue) : [];
    },
    set(value) {
      this.setDataValue('certifications', JSON.stringify(Array.isArray(value) ? value : []));
    }
  },
  acceptsDelivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  deliveryRange: {
    type: DataTypes.FLOAT,
    defaultValue: 25 // miles
  },
  // Field kept for backward compatibility with existing data
  // but ignored in application logic since FreshFarmily now handles all deliveries
  acceptsPickup: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  // Field kept for backward compatibility but no longer used
  pickupInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'farms',
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['zipCode']
    },
    {
      fields: ['isVerified', 'status']
    }
  ],
  hooks: {
    beforeCreate: (farm) => {
      logger.info(`Creating new farm: ${farm.name}`);
    },
    afterUpdate: (farm) => {
      logger.info(`Updated farm: ${farm.name}, status: ${farm.status}`);
    }
  }
});

// Establish associations (to be completed after User and Product models are defined)
const establishAssociations = () => {
  const { User } = require('./user');
  const { Product } = require('./product');
  
  // Farm belongs to User (farmer)
  Farm.belongsTo(User, {
    foreignKey: 'farmerId',
    as: 'FarmOwner'
  });
  
  // Farm has many Products
  Farm.hasMany(Product, {
    foreignKey: 'farmId',
    as: 'FarmProducts'
  });
  
  logger.debug('Farm associations established');
};

// Create the FarmPhoto model for farm gallery images
const FarmPhoto = sequelize.define('FarmPhoto', {
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
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'farm_photos'
});

// Farm-Photo associations
Farm.hasMany(FarmPhoto, {
  foreignKey: 'farmId',
  as: 'Photos'
});

FarmPhoto.belongsTo(Farm, {
  foreignKey: 'farmId',
  onDelete: 'CASCADE'
});

// Export models and association setter
module.exports = {
  Farm,
  FarmPhoto,
  establishFarmAssociations: establishAssociations
};
