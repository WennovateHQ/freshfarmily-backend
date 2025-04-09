/**
 * Cart Model
 * 
 * Defines the cart and cart item models for the FreshFarmily application
 */

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class Cart extends Model {}
class CartItem extends Model {}

// Initialize Cart model
Cart.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'checkout', 'completed', 'abandoned'),
    defaultValue: 'active',
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  taxes: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  deliveryFee: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    allowNull: false
  },
  totalItems: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  province: {
    type: DataTypes.STRING,
    defaultValue: 'BC',
    allowNull: true
  },
  deliveryMethod: {
    type: DataTypes.ENUM('delivery', 'pickup'),
    defaultValue: 'delivery',
    allowNull: true
  },
  applyFreeDelivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  lastActivity: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'Cart',
  tableName: 'carts',
  timestamps: true
});

// Initialize CartItem model
CartItem.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cartId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  farmId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  farmName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  additionalServices: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  }
}, {
  sequelize,
  modelName: 'CartItem',
  tableName: 'cart_items',
  timestamps: true
});

// Define associations
Cart.hasMany(CartItem, { 
  foreignKey: 'cartId',
  as: 'items',
  onDelete: 'CASCADE'
});

CartItem.belongsTo(Cart, { 
  foreignKey: 'cartId'
});

CartItem.belongsTo(sequelize.models.Product, {
  foreignKey: 'productId'
});

module.exports = {
  Cart,
  CartItem
};
