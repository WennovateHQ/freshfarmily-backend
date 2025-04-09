/**
 * Wishlist Model
 * 
 * Defines the Wishlist and WishlistItem models for the FreshFarmily system
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const { User } = require('./user');
const { Product } = require('./product');

// Define Wishlist model
const Wishlist = sequelize.define('Wishlist', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Define WishlistItem model
const WishlistItem = sequelize.define('WishlistItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  wishlistId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Wishlists',
      key: 'id'
    }
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  addedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

// Define associations
Wishlist.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Wishlist, { foreignKey: 'userId' });

Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlistId' });
WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlistId' });

// We'll only set up the association without references for now since there might be issues with table names
WishlistItem.belongsTo(Product, { foreignKey: 'productId' });

module.exports = { Wishlist, WishlistItem };
