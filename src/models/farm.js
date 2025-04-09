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
  // ***** Added farmerId field for the association with the User model *****
  farmerId: {
    type: DataTypes.UUID,
    allowNull: true // This is now allowNull true as per our database check
  },
  // Add the userId field which is required (NOT NULL)
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // ***********************************************************************
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contactEmail: {
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
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bannerUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isDefault: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false
  },
  operatingHours: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: {}
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
  timestamps: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['zipCode']
    },
    {
      fields: ['isDefault', 'isActive']
    }
  ],
  hooks: {
    beforeCreate: (farm) => {
      logger.info(`Creating new farm: ${farm.name}`);
    },
    afterUpdate: (farm) => {
      logger.info(`Updated farm: ${farm.name}, status: ${farm.isActive}`);
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
