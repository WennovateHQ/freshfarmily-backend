/**
 * Product Model
 * 
 * Defines the product entity for the FreshFarmily system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Product model definition
const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  farmId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  subcategory: {
    type: DataTypes.STRING,
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'lb' // pound, ounce, each, bunch, etc.
  },
  quantityAvailable: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  isOrganic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  harvestedDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  expectedAvailability: {
    type: DataTypes.DATE,
    allowNull: true
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: '[]'
  },
  nutritionInfo: {
    type: DataTypes.JSON,
    allowNull: true
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 100
    }
  },
  minOrderQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  maxOrderQuantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'out_of_stock', 'coming_soon', 'archived'),
    defaultValue: 'active'
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
  tableName: 'products',
  indexes: [
    {
      fields: ['farmId']
    },
    {
      fields: ['category']
    },
    {
      fields: ['isAvailable', 'status']
    },
    {
      fields: ['name']
    }
  ],
  hooks: {
    beforeCreate: (product) => {
      logger.info(`Creating new product: ${product.name} for farm ID: ${product.farmId}`);
    },
    afterUpdate: (product) => {
      if (product.changed('quantityAvailable')) {
        logger.info(`Updated product quantity: ${product.name}, new quantity: ${product.quantityAvailable}`);
      }
      if (product.changed('isAvailable')) {
        logger.info(`Product availability changed: ${product.name}, now ${product.isAvailable ? 'available' : 'unavailable'}`);
      }
    }
  }
});

// Create ProductPhoto model for product gallery images
const ProductPhoto = sequelize.define('ProductPhoto', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
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
  tableName: 'product_photos'
});

// Establish associations (to be completed after Farm model is defined)
const establishAssociations = () => {
  const { Farm } = require('./farm');
  
  // Product belongs to Farm
  Product.belongsTo(Farm, {
    foreignKey: 'farmId',
    as: 'Farm', // Added 'as: "Farm"' so that the association alias matches the frontend expectations
    onDelete: 'CASCADE'
  });
  
  // Product has many ProductPhotos
  Product.hasMany(ProductPhoto, {
    foreignKey: 'productId',
    as: 'Photos'
  });
  
  ProductPhoto.belongsTo(Product, {
    foreignKey: 'productId',
    onDelete: 'CASCADE'
  });
  
  logger.debug('Product associations established');
};

// Create ProductReview model
const ProductReview = sequelize.define('ProductReview', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  },
  review: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isVerifiedPurchase: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
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
  tableName: 'product_reviews',
  indexes: [
    {
      fields: ['productId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['rating']
    }
  ]
});

// Review associations
const establishReviewAssociations = () => {
  const { User } = require('./user');
  
  ProductReview.belongsTo(Product, {
    foreignKey: 'productId',
    onDelete: 'CASCADE'
  });
  
  ProductReview.belongsTo(User, {
    foreignKey: 'userId',
    as: 'Reviewer'
  });
  
  Product.hasMany(ProductReview, {
    foreignKey: 'productId',
    as: 'Reviews'
  });
  
  logger.debug('Product review associations established');
};

// Export models and association setters
module.exports = {
  Product,
  ProductPhoto,
  ProductReview,
  establishProductAssociations: establishAssociations,
  establishReviewAssociations: establishReviewAssociations
};
