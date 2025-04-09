/**
 * FreshFarmily Product Schema Migration
 * Date: 2025-03-26
 * 
 * This combined migration creates the necessary tables for the Product entity,
 * its associated ProductPhoto gallery, and ProductReview models.
 */

const { DataTypes } = require('sequelize');

async function up(queryInterface, Sequelize) {
  console.log('Creating Product, ProductPhoto, and ProductReview tables');

  // Create products table
  await queryInterface.createTable('products', {
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
      defaultValue: 'lb'
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
      defaultValue: 0
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Add indexes for products table
  await queryInterface.addIndex('products', ['farmId']);
  await queryInterface.addIndex('products', ['category']);
  await queryInterface.addIndex('products', {
    fields: ['isAvailable', 'status']
  });
  await queryInterface.addIndex('products', ['name']);

  // Create product_photos table
  await queryInterface.createTable('product_photos', {
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Create product_reviews table
  await queryInterface.createTable('product_reviews', {
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
      allowNull: false
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
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });

  // Add indexes for product_reviews table
  await queryInterface.addIndex('product_reviews', ['productId']);
  await queryInterface.addIndex('product_reviews', ['userId']);
  await queryInterface.addIndex('product_reviews', ['rating']);

  console.log('Product, ProductPhoto, and ProductReview tables created successfully');
}

async function down(queryInterface, Sequelize) {
  console.log('Dropping Product, ProductPhoto, and ProductReview tables');

  await queryInterface.dropTable('product_reviews');
  await queryInterface.dropTable('product_photos');
  await queryInterface.dropTable('products');

  // Drop ENUM types if they exist (for PostgreSQL)
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_products_status";');
  await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_reviews_status";');

  console.log('Rollback migration completed successfully');
}

module.exports = {
  up,
  down
};
