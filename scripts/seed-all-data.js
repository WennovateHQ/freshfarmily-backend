/**
 * FreshFarmily Full Database Seed Script
 * 
 * This script populates the database with comprehensive test data for all entities:
 * - Users (admin, farmers, drivers, consumers)
 * - Farms with photos and certifications
 * - Products with photos and reviews
 * - Wishlists
 * - Orders and order items
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../src/config/database');
const { User, Profile, Role } = require('../src/models/user');
const { Farm, FarmPhoto } = require('../src/models/farm');
const { Product, ProductPhoto, ProductReview } = require('../src/models/product');
const { Order, OrderItem } = require('../src/models/order');
const { Wishlist, WishlistItem } = require('../src/models/wishlist');
const logger = require('../src/utils/logger');

// Configuration
const NUM_ADMINS = 1;
const NUM_FARMERS = 5;
const NUM_DRIVERS = 3;
const NUM_CONSUMERS = 10;
const PRODUCTS_PER_FARM_MIN = 5;
const PRODUCTS_PER_FARM_MAX = 15;
const PHOTOS_PER_FARM_MIN = 1;
const PHOTOS_PER_FARM_MAX = 5;
const PHOTOS_PER_PRODUCT_MIN = 1;
const PHOTOS_PER_PRODUCT_MAX = 3;
const REVIEWS_PER_PRODUCT_MIN = 0;
const REVIEWS_PER_PRODUCT_MAX = 5;
const ORDERS_PER_CONSUMER_MIN = 0;
const ORDERS_PER_CONSUMER_MAX = 3;
const ITEMS_PER_ORDER_MIN = 1;
const ITEMS_PER_ORDER_MAX = 5;

// Store created entities for relationship creation
const createdEntities = {
  admins: [],
  farmers: [],
  drivers: [],
  consumers: [],
  farms: [],
  products: [],
  orders: [],
};

// Farm certifications
const CERTIFICATIONS = [
  'USDA Organic',
  'Non-GMO Project Verified',
  'Certified Naturally Grown',
  'Animal Welfare Approved',
  'Certified Humane',
  'Fair Trade Certified',
  'Regenerative Organic Certified',
  'Salmon-Safe',
  'Demeter Biodynamic',
  'American Grassfed',
];

// Product categories
const PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Herbs',
  'Meat',
  'Poultry',
  'Dairy',
  'Eggs',
  'Honey',
  'Preserves',
  'Baked Goods',
];

// US states and their abbreviations
const STATES = [
  { name: 'Alabama', abbr: 'AL' },
  { name: 'Alaska', abbr: 'AK' },
  { name: 'Arizona', abbr: 'AZ' },
  { name: 'Arkansas', abbr: 'AR' },
  { name: 'California', abbr: 'CA' },
  { name: 'Colorado', abbr: 'CO' },
  { name: 'Connecticut', abbr: 'CT' },
  { name: 'Delaware', abbr: 'DE' },
  { name: 'Florida', abbr: 'FL' },
  { name: 'Georgia', abbr: 'GA' },
  { name: 'Hawaii', abbr: 'HI' },
  { name: 'Idaho', abbr: 'ID' },
  { name: 'Illinois', abbr: 'IL' },
  { name: 'Indiana', abbr: 'IN' },
  { name: 'Iowa', abbr: 'IA' },
  { name: 'Kansas', abbr: 'KS' },
  { name: 'Kentucky', abbr: 'KY' },
];

// Helper functions
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomItems = (array, min, max) => {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const getRandomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Create users with different roles
async function createUsers() {
  logger.info('Creating users...');
  
  // Create roles if they don't exist
  const roles = {
    admin: await Role.findOrCreate({ where: { name: 'admin' } }).then(([role]) => role),
    farmer: await Role.findOrCreate({ where: { name: 'farmer' } }).then(([role]) => role),
    driver: await Role.findOrCreate({ where: { name: 'driver' } }).then(([role]) => role),
    consumer: await Role.findOrCreate({ where: { name: 'consumer' } }).then(([role]) => role),
  };

  // Create your specific admin account
  const adminUser = await User.create({
    email: 'admin@freshfarmily.com',
    password: await bcrypt.hash('Admin123!', 10),
    roleId: roles.admin.id,
    status: 'active',
    emailVerified: true,
  });

  const adminProfile = await Profile.create({
    userId: adminUser.id,
    firstName: 'Admin',
    lastName: 'User',
    phoneNumber: faker.phone.number(),
  });

  createdEntities.admins.push({ ...adminUser.get(), Profile: adminProfile.get() });

  // Create your specific test user for toturlad@gmail.com
  const testUser = await User.findOne({ where: { email: 'toturlad@gmail.com' } });
  if (!testUser) {
    const newTestUser = await User.create({
      email: 'toturlad@gmail.com',
      password: await bcrypt.hash('Password123!', 10),
      roleId: roles.consumer.id,
      status: 'active',
      emailVerified: true,
    });

    await Profile.create({
      userId: newTestUser.id,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: faker.phone.number(),
    });

    // Make this user retrievable for later use
    const testUserWithProfile = await User.findByPk(newTestUser.id, {
      include: [{ model: Profile }]
    });
    createdEntities.consumers.push(testUserWithProfile.get());
  }

  // Create more admin users
  for (let i = 0; i < NUM_ADMINS - 1; i++) {
    const user = await User.create({
      email: faker.internet.email(),
      password: await bcrypt.hash('Password123!', 10),
      roleId: roles.admin.id,
      status: 'active',
      emailVerified: true,
    });

    const profile = await Profile.create({
      userId: user.id,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phoneNumber: faker.phone.number(),
    });

    createdEntities.admins.push({ ...user.get(), Profile: profile.get() });
  }

  // Create farmer users
  for (let i = 0; i < NUM_FARMERS; i++) {
    const user = await User.create({
      email: faker.internet.email(),
      password: await bcrypt.hash('Password123!', 10),
      roleId: roles.farmer.id,
      status: 'active',
      emailVerified: true,
    });

    const profile = await Profile.create({
      userId: user.id,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phoneNumber: faker.phone.number(),
    });

    createdEntities.farmers.push({ ...user.get(), Profile: profile.get() });
  }

  // Create driver users
  for (let i = 0; i < NUM_DRIVERS; i++) {
    const user = await User.create({
      email: faker.internet.email(),
      password: await bcrypt.hash('Password123!', 10),
      roleId: roles.driver.id,
      status: 'active',
      emailVerified: true,
    });

    const profile = await Profile.create({
      userId: user.id,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phoneNumber: faker.phone.number(),
    });

    createdEntities.drivers.push({ ...user.get(), Profile: profile.get() });
  }

  // Create consumer users (in addition to the test user)
  for (let i = 0; i < NUM_CONSUMERS - 1; i++) {
    const user = await User.create({
      email: faker.internet.email(),
      password: await bcrypt.hash('Password123!', 10),
      roleId: roles.consumer.id,
      status: 'active',
      emailVerified: true,
    });

    const profile = await Profile.create({
      userId: user.id,
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      phoneNumber: faker.phone.number(),
    });

    createdEntities.consumers.push({ ...user.get(), Profile: profile.get() });
  }

  logger.info(`Created ${createdEntities.admins.length} admins, ${createdEntities.farmers.length} farmers, ${createdEntities.drivers.length} drivers, and ${createdEntities.consumers.length} consumers`);
}

// Create farms and their photos
async function createFarms() {
  logger.info('Creating farms...');

  // Each farmer gets 1 farm
  for (const farmer of createdEntities.farmers) {
    // Generate random location
    const state = getRandomItem(STATES);
    const city = faker.location.city();
    
    // Generate random certifications
    const certifications = getRandomItems(CERTIFICATIONS, 0, 3);
    
    const farm = await Farm.create({
      name: `${faker.company.name()} Farm`,
      farmerId: farmer.id,
      description: faker.lorem.paragraph(),
      address: faker.location.streetAddress(),
      city,
      state: state.abbr,
      zipCode: faker.location.zipCode(),
      phoneNumber: faker.phone.number(),
      email: faker.internet.email(),
      website: Math.random() > 0.5 ? faker.internet.url() : null,
      isVerified: Math.random() > 0.2, // 80% chance to be verified
      status: 'active',
      acceptsDelivery: Math.random() > 0.3, // 70% chance to accept delivery
      acceptsPickup: true, // All farms accept pickup
      deliveryRange: Math.random() > 0.3 ? getRandomInt(5, 50) : 25,
      pickupInstructions: Math.random() > 0.5 ? faker.lorem.paragraph() : null,
      latitude: faker.location.latitude(),
      longitude: faker.location.longitude(),
      certifications: certifications.length > 0 ? certifications : [],
      imageUrl: faker.image.url()
    });

    // Add photos to the farm
    const mockPhotos = [];
    const numPhotos = getRandomInt(PHOTOS_PER_FARM_MIN, PHOTOS_PER_FARM_MAX);
    for (let i = 0; i < numPhotos; i++) {
      // Create FarmPhoto in database
      const farmPhoto = await FarmPhoto.create({
        farmId: farm.id,
        url: faker.image.url(),
        isMain: i === 0, // First photo is the main one
        caption: faker.lorem.sentence(),
        order: i
      });
      
      mockPhotos.push(farmPhoto.get());
    }

    // Add the photos to our farm object for use in the frontend
    const farmWithPhotos = { ...farm.get(), Photos: mockPhotos };
    createdEntities.farms.push(farmWithPhotos);
  }

  logger.info(`Created ${createdEntities.farms.length} farms`);
}

// Create products for each farm
async function createProducts() {
  logger.info('Creating products...');

  for (const farm of createdEntities.farms) {
    const numProducts = getRandomInt(PRODUCTS_PER_FARM_MIN, PRODUCTS_PER_FARM_MAX);
    
    for (let i = 0; i < numProducts; i++) {
      const category = getRandomItem(PRODUCT_CATEGORIES);
      const isOrganic = farm.certifications && farm.certifications.includes('USDA Organic');
      const price = getRandomInt(2, 40) + 0.99; // Random price between $2.99 and $40.99
      
      const product = await Product.create({
        farmId: farm.id,
        name: `${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
        description: faker.commerce.productDescription(),
        category,
        subcategory: Math.random() > 0.5 ? faker.commerce.productAdjective() : null,
        price,
        unit: getRandomItem(['lb', 'oz', 'each', 'bunch', 'dozen']),
        quantityAvailable: getRandomInt(0, 100),
        isOrganic,
        isFeatured: Math.random() > 0.8, // 20% chance to be featured
        tags: JSON.stringify(getRandomItems(['seasonal', 'bestseller', 'new', 'limited'], 0, 2)),
        imageUrl: faker.image.url(),
        status: 'active'
      });

      // Add product photos
      const mockPhotos = [];
      const numPhotos = getRandomInt(PHOTOS_PER_PRODUCT_MIN, PHOTOS_PER_PRODUCT_MAX);
      for (let j = 0; j < numPhotos; j++) {
        const photoData = {
          productId: product.id,
          url: faker.image.url(),
          isPrimary: j === 0, // First photo is primary
          caption: Math.random() > 0.3 ? faker.lorem.sentence() : null,
          order: j
        };
        
        const photo = await ProductPhoto.create(photoData);
        mockPhotos.push(photo.get());
      }

      // Add product reviews from random consumers
      const reviews = [];
      const numReviews = getRandomInt(REVIEWS_PER_PRODUCT_MIN, REVIEWS_PER_PRODUCT_MAX);
      
      for (let j = 0; j < numReviews; j++) {
        // Get a random consumer
        const consumer = getRandomItem(createdEntities.consumers);
        
        const reviewData = {
          productId: product.id,
          userId: consumer.id,
          rating: getRandomInt(3, 5), // Mostly positive reviews (3-5 stars)
          title: faker.lorem.sentence().substring(0, 50),
          content: faker.lorem.paragraph(),
          status: 'approved'
        };
        
        const review = await ProductReview.create(reviewData);
        reviews.push(review.get());
      }

      // Add the product with its photos and reviews to our list
      const productWithDetails = { 
        ...product.get(), 
        Photos: mockPhotos,
        Reviews: reviews
      };
      
      createdEntities.products.push(productWithDetails);
    }
  }

  logger.info(`Created ${createdEntities.products.length} products`);
}

// Create wishlists for consumers
async function createWishlists() {
  logger.info('Creating wishlists...');

  for (const consumer of createdEntities.consumers) {
    // Create wishlist
    const wishlist = await Wishlist.create({
      userId: consumer.id,
    });

    // Add random products to wishlist (0-5 products)
    const numWishlistItems = getRandomInt(0, 5);
    const randomProducts = getRandomItems(createdEntities.products, numWishlistItems, numWishlistItems);
    
    for (const product of randomProducts) {
      await WishlistItem.create({
        wishlistId: wishlist.id,
        productId: product.id,
      });
    }
  }

  logger.info(`Created wishlists for ${createdEntities.consumers.length} consumers`);
}

// Create orders for consumers
async function createOrders() {
  logger.info('Creating orders...');

  // Order statuses
  const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled', 'refunded'];

  for (const consumer of createdEntities.consumers) {
    const numOrders = getRandomInt(ORDERS_PER_CONSUMER_MIN, ORDERS_PER_CONSUMER_MAX);
    
    for (let i = 0; i < numOrders; i++) {
      // Pick a random farm for this order
      const farm = getRandomItem(createdEntities.farms);
      const orderStatus = getRandomItem(ORDER_STATUSES);
      const deliveryMethod = getRandomItem(['pickup', 'delivery']);
      
      // Create random date in the past year
      const orderDate = new Date();
      orderDate.setDate(orderDate.getDate() - getRandomInt(0, 365));
      
      // Generate a unique order number
      const orderNumber = `ORD-${Date.now().toString().substring(7)}-${getRandomInt(1000, 9999)}`;
      
      // Create the order
      const order = await Order.create({
        userId: consumer.id,
        orderNumber,
        status: orderStatus,
        deliveryMethod,
        deliveryAddress: deliveryMethod === 'delivery' ? faker.location.streetAddress() : null,
        deliveryCity: deliveryMethod === 'delivery' ? faker.location.city() : null,
        deliveryState: deliveryMethod === 'delivery' ? getRandomItem(STATES).abbr : null,
        deliveryZipCode: deliveryMethod === 'delivery' ? faker.location.zipCode() : null,
        deliveryInstructions: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        requestedDeliveryDate: deliveryMethod === 'delivery' ? new Date(orderDate.getTime() + getRandomInt(1, 10) * 86400000) : null,
        totalAmount: 0, // Will be calculated based on items
        subTotal: 0, // Will be calculated
        taxAmount: 0, // Will be calculated
        deliveryFee: deliveryMethod === 'delivery' ? getRandomInt(5, 15) : 0,
        discountAmount: Math.random() > 0.8 ? getRandomInt(2, 10) : 0,
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      // Get random products from this farm
      const farmProducts = createdEntities.products.filter(p => p.farmId === farm.id);
      
      // If no products found for this farm, skip adding order items
      if (!farmProducts.length) {
        await order.destroy(); // Delete the order since it has no items
        continue;
      }
      
      const numOrderItems = getRandomInt(ITEMS_PER_ORDER_MIN, Math.min(ITEMS_PER_ORDER_MAX, farmProducts.length));
      const orderProducts = getRandomItems(farmProducts, numOrderItems, numOrderItems);
      
      let subTotal = 0;
      
      // Add order items
      for (const product of orderProducts) {
        const quantity = getRandomInt(1, 5);
        const price = parseFloat(product.price);
        const total = price * quantity;
        subTotal += total;
        
        await OrderItem.create({
          orderId: order.id,
          productId: product.id,
          quantity,
          price,
          total,
          name: product.name, // Store product name at time of order
          notes: Math.random() > 0.9 ? faker.lorem.sentence() : null,
        });
      }
      
      // Update order totals
      const taxAmount = Math.round(subTotal * 0.08 * 100) / 100; // 8% tax
      const totalAmount = subTotal + taxAmount + order.deliveryFee - order.discountAmount;
      
      await order.update({
        subTotal,
        taxAmount,
        totalAmount,
      });
      
      createdEntities.orders.push(order.get());
    }
  }

  logger.info(`Created ${createdEntities.orders.length} orders`);
}

// Check models and associations are correctly set up
async function setupModels() {
  // Import necessary association establishment functions
  const { establishAssociations: setupFarmAssociations } = require('../src/models/farm');
  const { establishAssociations: setupProductAssociations } = require('../src/models/product');
  const { establishAssociations: setupOrderAssociations } = require('../src/models/order');
  
  try {
    // Initialize associations between models
    logger.info('Setting up model associations...');
    
    // Call each model's association setup function
    if (typeof setupFarmAssociations === 'function') setupFarmAssociations();
    if (typeof setupProductAssociations === 'function') setupProductAssociations();
    if (typeof setupOrderAssociations === 'function') setupOrderAssociations();
    
    logger.info('Model associations established.');
  } catch (error) {
    logger.error('Error setting up model associations:', error);
    throw error;
  }
}

// Main function to run the seed
async function seedDatabase() {
  try {
    // Check database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully!');
    
    // Setup model associations
    await setupModels();
    
    // Drop and recreate all tables (CAUTION: destructive operation)
    if (process.env.SEED_RESET_DB === 'true') {
      logger.warn('RESETTING DATABASE - all existing data will be lost!');
      await sequelize.sync({ force: true });
      logger.info('Database schema reset and recreated.');
    } else {
      // Just sync models
      await sequelize.sync();
      logger.info('Database schema synchronized.');
    }
    
    // Create all entities
    await createUsers();
    await createFarms();
    await createProducts();
    await createWishlists();
    await createOrders();
    
    logger.info('Database successfully seeded with test data!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed
seedDatabase();
