/**
 * Model Initialization
 * 
 * This file initializes all models and their associations
 * to ensure they are properly set up before the app starts.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// Import models
const { User, Profile } = require('./user');
const { Farm, FarmPhoto, establishFarmAssociations } = require('./farm');
const { Product, ProductPhoto, ProductReview } = require('./product');
const { Order, OrderItem, establishOrderAssociations } = require('./order');
const { Delivery } = require('./delivery');

/**
 * Initialize models and their associations
 */
function initializeModels() {
  logger.info('Initializing database models and associations...');
  
  try {
    // Define model associations

    // User associations
    User.hasMany(Farm, { foreignKey: 'farmerId', as: 'Farms' });
    User.hasMany(Order, { foreignKey: 'userId', as: 'Orders' });
    User.hasMany(Delivery, { foreignKey: 'driverId', as: 'Deliveries' });
    User.hasMany(ProductReview, { foreignKey: 'userId', as: 'Reviews' });

    // Farm associations
    Farm.belongsTo(User, { foreignKey: 'farmerId', as: 'Farmer' });
    Farm.hasMany(Product, { foreignKey: 'farmId', as: 'Products' });
    Farm.hasMany(FarmPhoto, { foreignKey: 'farmId', as: 'FarmPhotos' });

    // Product associations
    Product.belongsTo(Farm, { foreignKey: 'farmId' });
    Product.hasMany(ProductPhoto, { foreignKey: 'productId', as: 'ProductPhotos' });
    Product.hasMany(ProductReview, { foreignKey: 'productId', as: 'Reviews' });
    Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'OrderItems' });

    // Order associations
    Order.belongsTo(User, { foreignKey: 'userId', as: 'Consumer' });
    Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'Items' });
    // PaymentInfo association removed until PaymentInfo model is properly implemented
    Order.hasOne(Delivery, { foreignKey: 'orderId', as: 'Delivery' });

    // OrderItem associations
    OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
    OrderItem.belongsTo(Product, { foreignKey: 'productId' });

    // Delivery associations
    Delivery.belongsTo(Order, { foreignKey: 'orderId' });
    Delivery.belongsTo(User, { foreignKey: 'driverId', as: 'Driver' });

    // Call any additional association setters from models
    if (typeof establishFarmAssociations === 'function') {
      establishFarmAssociations();
    }
    
    if (typeof establishOrderAssociations === 'function') {
      establishOrderAssociations();
    }

    logger.info('Model associations initialized successfully');
  } catch (error) {
    logger.error(`Error initializing model associations: ${error.message}`);
    throw error;
  }
}

// Export models and initialization function
module.exports = {
  sequelize,
  User,
  Profile,
  Farm,
  FarmPhoto,
  Product,
  ProductPhoto,
  ProductReview,
  Order,
  OrderItem,
  Delivery,
  initializeModels
};
