/**
 * Farm and Product Seeder for FreshFarmily
 * 
 * This script creates sample farms with products for testing purposes
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { sequelize } = require('../src/config/database');
const logger = require('../src/utils/logger');

// Import models from the index to ensure associations are properly set up
const db = require('../src/models/index');
const { Farm, FarmPhoto } = db;
const { Product, ProductPhoto } = db;
const { User, Profile } = db;

// Seed configuration
const NUM_FARMS = 10;
const PRODUCTS_PER_FARM_MIN = 3;
const PRODUCTS_PER_FARM_MAX = 10;
const PHOTOS_PER_FARM = 2;
const PHOTOS_PER_PRODUCT = 2;

// Product categories
const PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Herbs',
  'Meat',
  'Dairy',
  'Eggs',
  'Honey',
  'Baked Goods'
];

// Certifications
const CERTIFICATIONS = [
  'USDA Organic',
  'Non-GMO Project Verified',
  'Certified Naturally Grown',
  'Animal Welfare Approved',
  'Certified Humane'
];

// Helper functions
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomItems = (array, min, max) => {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
const getRandomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Find a farmer user or admin as fallback
async function getFarmerUser() {
  try {
    // Try to find a user with farmer role
    const farmer = await User.findOne({
      include: [{
        model: Profile,
        required: true
      }],
      where: {
        roleId: 'farmer' // This might need adjustment based on your schema
      }
    });

    if (farmer) {
      logger.info(`Found farmer user: ${farmer.email}`);
      return farmer;
    }

    // If no farmer found, get any user (preferably admin)
    const anyUser = await User.findOne({
      include: [{
        model: Profile,
        required: true
      }]
    });

    if (anyUser) {
      logger.info(`No farmer found, using user: ${anyUser.email}`);
      return anyUser;
    }

    // If no user exists at all, create one
    logger.info('No users found, creating a test user...');
    
    // Create a test user
    const newUser = await User.create({
      email: 'test-farmer@freshfarmily.com',
      password: 'password123', // Would normally be hashed
      status: 'active',
      emailVerified: true
    });

    await Profile.create({
      userId: newUser.id,
      firstName: 'Test',
      lastName: 'Farmer',
      phoneNumber: faker.phone.number()
    });

    return await User.findByPk(newUser.id, {
      include: [{ model: Profile }]
    });
  } catch (error) {
    logger.error('Error finding/creating farmer user:', error);
    throw error;
  }
}

// Create farms with products
async function createFarmsAndProducts() {
  try {
    const farmerUser = await getFarmerUser();

    logger.info(`Creating ${NUM_FARMS} farms...`);

    for (let i = 0; i < NUM_FARMS; i++) {
      // Create a farm
      const farmName = `${faker.company.name()} Farm`;
      const farm = await Farm.create({
        name: farmName,
        farmerId: farmerUser.id,
        description: faker.lorem.paragraph(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state().slice(0, 2),
        zipCode: faker.location.zipCode(),
        phoneNumber: faker.phone.number(),
        email: faker.internet.email(),
        website: Math.random() > 0.5 ? faker.internet.url() : null,
        isVerified: Math.random() > 0.2, // 80% chance to be verified
        status: 'active',
        acceptsDelivery: Math.random() > 0.3,
        acceptsPickup: true,
        deliveryRange: Math.random() > 0.3 ? getRandomInt(5, 50) : 25,
        pickupInstructions: Math.random() > 0.5 ? faker.lorem.paragraph() : null,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        certifications: getRandomItems(CERTIFICATIONS, 0, 2),
        imageUrl: faker.image.url()
      });

      logger.info(`Created farm: ${farmName}`);

      // Add photos to the farm
      for (let j = 0; j < PHOTOS_PER_FARM; j++) {
        await FarmPhoto.create({
          farmId: farm.id,
          url: faker.image.url(),
          isMain: j === 0, // First photo is main
          caption: faker.lorem.sentence(),
          order: j
        });
      }

      // Create products for this farm
      const numProducts = getRandomInt(PRODUCTS_PER_FARM_MIN, PRODUCTS_PER_FARM_MAX);
      
      for (let j = 0; j < numProducts; j++) {
        const category = getRandomItem(PRODUCT_CATEGORIES);
        const productName = `${faker.commerce.productAdjective()} ${faker.commerce.product()}`;
        
        const product = await Product.create({
          farmId: farm.id,
          name: productName,
          description: faker.commerce.productDescription(),
          category,
          subcategory: Math.random() > 0.5 ? faker.commerce.productAdjective() : null,
          price: parseFloat((getRandomInt(2, 40) + Math.random()).toFixed(2)),
          unit: getRandomItem(['lb', 'oz', 'each', 'bunch', 'dozen']),
          quantityAvailable: getRandomInt(0, 100),
          isOrganic: Math.random() > 0.5,
          isFeatured: Math.random() > 0.8,
          tags: JSON.stringify(getRandomItems(['seasonal', 'bestseller', 'new', 'limited'], 0, 2)),
          imageUrl: faker.image.url(),
          status: 'active'
        });
        
        logger.info(`Created product: ${productName}`);

        // Add photos to the product
        for (let k = 0; k < PHOTOS_PER_PRODUCT; k++) {
          await ProductPhoto.create({
            productId: product.id,
            url: faker.image.url(),
            isPrimary: k === 0,
            caption: Math.random() > 0.3 ? faker.lorem.sentence() : null,
            order: k
          });
        }
      }
    }

    logger.info('✅ Successfully created farms and products!');
  } catch (error) {
    logger.error('Error creating farms and products:', error);
    throw error;
  }
}

// Main function to run the seeder
async function seedFarmsAndProducts() {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully!');
    
    // Run the seed
    await createFarmsAndProducts();
    
    logger.info('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seed
seedFarmsAndProducts();
