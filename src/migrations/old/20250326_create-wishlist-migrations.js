/**
 * FreshFarmily Wishlist Schema Migration
 * Date: 2025-03-26
 * 
 * This migration creates the necessary tables for the Wishlist and WishlistItem models.
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating Wishlist and WishlistItem tables');

  // Create wishlists table
  await queryInterface.createTable('wishlists', {
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
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Create wishlist_items table
  await queryInterface.createTable('wishlist_items', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    wishlistId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'wishlists',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    productId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    addedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  console.log('Wishlist and WishlistItem tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping Wishlist and WishlistItem tables');

  await queryInterface.dropTable('wishlist_items');
  await queryInterface.dropTable('wishlists');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
