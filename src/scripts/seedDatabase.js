/**
 * Database Seed Script
 * 
 * This script populates the database with test data including:
 * - Users of each type (admin, farmer, driver, consumer)
 * - Farms for the farmer user
 * - Products for each category (5 products per category)
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const { User, Profile, Farm, FarmPhoto, Product, ProductPhoto } = require('../models');
const logger = require('../utils/logger');

// Product categories available in the app
const productCategories = [
  'Vegetables',
  'Fruits',
  'Herbs',
  'Dairy',
  'Eggs',
  'Meat',
  'Poultry',
  'Seafood',
  'Honey',
  'Baked Goods',
  'Preserves',
  'Flowers',
  'Plants',
  'Other'
];

// Units for products
const units = ['lb', 'oz', 'each', 'bunch', 'pint', 'quart', 'gallon', 'dozen', 'half-dozen', 'basket', 'box'];

// Canadian province abbreviations for random generation
const provinces = ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'];

// Sample farm certifications
const certifications = [
  'USDA Organic',
  'Non-GMO Project Verified',
  'Certified Naturally Grown',
  'Certified Humane',
  'Animal Welfare Approved',
  'Fair Trade Certified',
  'Rainforest Alliance Certified',
  'Salmon Safe',
  'Demeter Certified Biodynamic',
  'Food Alliance Certified'
];

// Helper function to get random item from array
const getRandomItem = (items) => items[Math.floor(Math.random() * items.length)];

// Helper function to get random number in range
const getRandomNumber = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper function to get random boolean
const getRandomBoolean = () => Math.random() > 0.5;

// Helper function to get random date in the past year
const getRandomPastDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - getRandomNumber(1, 365));
  return date;
};

// Helper function to get random date in the future year
const getRandomFutureDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + getRandomNumber(1, 365));
  return date;
};

// Helper function to get random price
const getRandomPrice = (min = 1, max = 50) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
};

// Helper function to get random quantity
const getRandomQuantity = (min = 10, max = 100) => {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
};

// Helper function to get random certification list
const getRandomCertifications = () => {
  const numCerts = getRandomNumber(0, 3);
  if (numCerts === 0) return [];
  
  const selectedCerts = [];
  const availableCerts = [...certifications];
  
  for (let i = 0; i < numCerts; i++) {
    const index = getRandomNumber(0, availableCerts.length - 1);
    selectedCerts.push(availableCerts.splice(index, 1)[0]);
  }
  
  return selectedCerts;
};

// Helper function to generate product data
const generateProductData = (farmId, category) => {
  const productNames = {
    Vegetables: ['Carrots', 'Tomatoes', 'Lettuce', 'Kale', 'Spinach', 'Broccoli', 'Cauliflower', 'Bell Peppers', 'Cucumbers', 'Zucchini'],
    Fruits: ['Apples', 'Strawberries', 'Blueberries', 'Peaches', 'Plums', 'Cherries', 'Pears', 'Watermelon', 'Cantaloupe', 'Grapes'],
    Herbs: ['Basil', 'Cilantro', 'Mint', 'Rosemary', 'Thyme', 'Sage', 'Oregano', 'Dill', 'Parsley', 'Chives'],
    Dairy: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Cream', 'Sour Cream', 'Cottage Cheese', 'Kefir', 'Ice Cream', 'Buttermilk'],
    Eggs: ['Chicken Eggs', 'Duck Eggs', 'Quail Eggs', 'Turkey Eggs', 'Free-Range Eggs', 'Organic Eggs', 'Farm Fresh Eggs', 'Fertilized Eggs', 'Pasture-Raised Eggs', 'Jumbo Eggs'],
    Meat: ['Beef', 'Pork', 'Lamb', 'Goat', 'Bison', 'Venison', 'Ground Beef', 'Steak', 'Ribs', 'Roast'],
    Poultry: ['Chicken', 'Turkey', 'Duck', 'Quail', 'Goose', 'Whole Chicken', 'Chicken Breast', 'Chicken Thighs', 'Turkey Breast', 'Duck Breast'],
    Seafood: ['Salmon', 'Trout', 'Catfish', 'Tilapia', 'Shrimp', 'Oysters', 'Mussels', 'Clams', 'Crab', 'Lobster'],
    Honey: ['Wildflower Honey', 'Clover Honey', 'Buckwheat Honey', 'Raw Honey', 'Orange Blossom Honey', 'Honeycomb', 'Creamed Honey', 'Infused Honey', 'Manuka Honey', 'Local Honey'],
    'Baked Goods': ['Bread', 'Muffins', 'Cookies', 'Pies', 'Cakes', 'Pastries', 'Scones', 'Bagels', 'Croissants', 'Donuts'],
    Preserves: ['Jam', 'Jelly', 'Salsa', 'Pickles', 'Sauerkraut', 'Kimchi', 'Chutney', 'Marmalade', 'Preserves', 'Fruit Butter'],
    Flowers: ['Sunflowers', 'Lavender', 'Roses', 'Daisies', 'Tulips', 'Lilies', 'Peonies', 'Zinnias', 'Wildflower Bouquet', 'Dried Flowers'],
    Plants: ['Herb Seedlings', 'Vegetable Starts', 'Succulents', 'Houseplants', 'Hanging Plants', 'Fruit Trees', 'Berry Bushes', 'Flowering Shrubs', 'Native Plants', 'Potted Herbs'],
    Other: ['Maple Syrup', 'Soap', 'Candles', 'Wool', 'Firewood', 'Compost', 'Flower Seeds', 'Vegetable Seeds', 'Pet Treats', 'Handcrafted Items']
  };
  
  const productDescriptions = {
    Vegetables: 'Fresh, locally grown vegetables harvested at peak ripeness for maximum flavor and nutrition.',
    Fruits: 'Sweet and juicy fruits grown with care and harvested when perfectly ripe.',
    Herbs: 'Aromatic herbs that add fresh flavor to your favorite dishes.',
    Dairy: 'Creamy, delicious dairy products from pasture-raised animals.',
    Eggs: 'Farm-fresh eggs from happy, healthy hens with rich, golden yolks.',
    Meat: 'Ethically raised, grass-fed meat from animals raised with care on open pastures.',
    Poultry: 'Pasture-raised poultry that is tender, flavorful, and humanely raised.',
    Seafood: 'Sustainably sourced seafood caught or raised using environmentally friendly methods.',
    Honey: 'Pure, raw honey produced by bees from local wildflowers.',
    'Baked Goods': 'Freshly baked goods made with farm-fresh ingredients and traditional methods.',
    Preserves: 'Handcrafted preserves made in small batches using traditional recipes.',
    Flowers: 'Beautiful, locally grown flowers to brighten your home or special occasion.',
    Plants: 'Healthy plants grown with care to thrive in your garden or home.',
    Other: 'Unique farm products crafted with care and sustainable practices.'
  };
  
  const names = productNames[category];
  const name = `${getRandomItem(['Organic', 'Fresh', 'Premium', 'Heirloom', 'Local', 'Hand-Picked', 'Farm-Fresh', 'Artisanal', 'Small-Batch', 'Naturally Grown'])} ${getRandomItem(names)}`;
  
  return {
    id: uuidv4(),
    farmId,
    name,
    description: `${productDescriptions[category]} Our ${name.toLowerCase()} are grown using sustainable farming practices.`,
    category,
    subcategory: names.find(n => name.includes(n)) || '',
    price: getRandomPrice(2, 30),
    unit: getRandomItem(units),
    quantityAvailable: getRandomQuantity(),
    isOrganic: name.includes('Organic'),
    isAvailable: getRandomBoolean(),
    imageUrl: `https://source.unsplash.com/random/300x300/?${encodeURIComponent(name.toLowerCase())}`,
    harvestedDate: getRandomPastDate(),
    expectedAvailability: getRandomFutureDate(),
    tags: JSON.stringify([category, names.find(n => name.includes(n)) || '', getRandomItem(['Seasonal', 'Fresh', 'Local', 'Organic', 'Heirloom', 'Non-GMO'])]),
    nutritionInfo: JSON.stringify(category === 'Vegetables' || category === 'Fruits' ? {
      calories: getRandomNumber(20, 150),
      protein: getRandomNumber(1, 5),
      fiber: getRandomNumber(1, 10),
      vitamins: ['Vitamin A', 'Vitamin C', 'Vitamin K']
    } : null),
    isFeatured: Math.random() < 0.3, // 30% chance of being featured
    discountPercent: Math.random() < 0.2 ? getRandomNumber(5, 25) : 0, // 20% chance of discount
    minOrderQuantity: 1,
    maxOrderQuantity: getRandomNumber(20, 100),
    status: getRandomItem(['active', 'active', 'active', 'out_of_stock', 'coming_soon']), // Weighted toward active
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Helper function to generate farm data
const generateFarmData = (farmerId, index) => {
  const cities = ['Vancouver', 'Calgary', 'Toronto', 'Montreal', 'Halifax', 'St. John\'s', 'Winnipeg', 'Regina', 'Edmonton', 'Victoria'];
  const farmNames = [
    'Green Valley Farm',
    'Sunflower Acres',
    'Harmony Homestead',
    'Wildwood Farm',
    'Rolling Hills Orchard',
    'Maple Creek Farm',
    'Blue Sky Ranch',
    'Mountain View Gardens',
    'Riverside Farms',
    'Meadow Lane Farm'
  ];
  
  return {
    id: uuidv4(),
    farmerId,
    name: farmNames[index % farmNames.length],
    description: `A sustainable family farm specializing in organic produce, pasture-raised livestock, and artisanal farm products. We're committed to environmentally friendly farming practices and producing the highest quality food for our community.`,
    address: `${getRandomNumber(100, 9999)} ${getRandomItem(['Farm', 'Country', 'Rural', 'Valley', 'Hillside', 'Meadow', 'Forest', 'River', 'Mountain', 'Lakeside'])} Road`,
    city: getRandomItem(cities),
    state: getRandomItem(provinces),
    zipCode: `${getRandomNumber(10000, 99999)}`,
    latitude: (Math.random() * 10) + 35, // Random coordinates in continental US
    longitude: (Math.random() * 40) - 120,
    phoneNumber: `(${getRandomNumber(100, 999)}) ${getRandomNumber(100, 999)}-${getRandomNumber(1000, 9999)}`,
    email: `contact@${farmNames[index % farmNames.length].toLowerCase().replace(/\s+/g, '')}.com`,
    website: `https://www.${farmNames[index % farmNames.length].toLowerCase().replace(/\s+/g, '')}.com`,
    isVerified: getRandomBoolean(),
    status: getRandomItem(['active', 'active', 'active', 'pending', 'suspended']), // Weighted toward active
    imageUrl: `https://source.unsplash.com/random/800x600/?farm,${encodeURIComponent(farmNames[index % farmNames.length].split(' ')[0].toLowerCase())}`,
    certifications: getRandomCertifications(),
    deliveryRange: getRandomNumber(5, 50), // Retained for calculating delivery distances
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

// Main seed function
async function seedDatabase() {
  try {
    // Sync database models
    await sequelize.sync({ force: true }); // CAUTION: This will drop all tables!
    logger.info('Database synchronized');
    
    // Create users of each type
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    
    const users = [
      {
        id: uuidv4(),
        email: 'admin@freshfarmily.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: JSON.stringify(['read', 'write', 'update', 'delete', 'admin']),
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'farmer@freshfarmily.com',
        password: hashedPassword,
        firstName: 'Farmer',
        lastName: 'Smith',
        role: 'farmer',
        permissions: JSON.stringify(['read', 'write', 'update', 'delete_own']),
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'driver@freshfarmily.com',
        password: hashedPassword,
        firstName: 'Driver',
        lastName: 'Jones',
        role: 'driver',
        permissions: JSON.stringify(['read', 'update_delivery']),
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        email: 'consumer@freshfarmily.com',
        password: hashedPassword,
        firstName: 'Consumer',
        lastName: 'Brown',
        role: 'consumer',
        permissions: JSON.stringify(['read', 'create_order']),
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    const createdUsers = await User.bulkCreate(users);
    logger.info('Created users:', createdUsers.map(u => u.email).join(', '));
    
    // Create profiles for each user
    const profiles = createdUsers.map(user => ({
      id: uuidv4(),
      userId: user.id,
      address: `${getRandomNumber(100, 9999)} ${getRandomItem(['Main', 'Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Walnut'])} Street`,
      city: getRandomItem(['Vancouver', 'Calgary', 'Toronto', 'Montreal', 'Halifax', 'St. John\'s', 'Winnipeg', 'Regina', 'Edmonton', 'Victoria']),
      state: getRandomItem(provinces),
      zipCode: `${getRandomNumber(10000, 99999)}`,
      phone: `(${getRandomNumber(100, 999)}) ${getRandomNumber(100, 999)}-${getRandomNumber(1000, 9999)}`,
      bio: user.role === 'farmer' 
        ? 'Multi-generational farmer passionate about sustainable agriculture.'
        : user.role === 'driver'
        ? 'Reliable driver dedicated to timely deliveries and customer satisfaction.'
        : 'Food enthusiast who loves supporting local farmers and eating fresh, seasonal produce.',
      profileImage: `https://source.unsplash.com/random/300x300/?portrait,${user.role}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    await Profile.bulkCreate(profiles);
    logger.info('Created profiles for all users');
    
    // Create farms for the farmer user
    const farmerUser = createdUsers.find(u => u.role === 'farmer');
    const farmData = [];
    const farmPhotoData = [];
    
    for (let i = 0; i < 3; i++) {
      const farmId = uuidv4();
      const farm = generateFarmData(farmerUser.id, i);
      farm.id = farmId;
      farmData.push(farm);
      
      // Create 3 photos for each farm
      for (let j = 0; j < 3; j++) {
        farmPhotoData.push({
          id: uuidv4(),
          farmId,
          url: `https://source.unsplash.com/random/800x600/?farm,${encodeURIComponent(farm.name.split(' ')[0].toLowerCase())},${j}`,
          caption: `${farm.name} - ${getRandomItem(['Fields', 'Farm Stand', 'Produce', 'Animals', 'Landscape', 'Harvest', 'Greenhouse', 'Orchard'])}`,
          isMain: j === 0, // First photo is main
          order: j,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    const createdFarms = await Farm.bulkCreate(farmData);
    await FarmPhoto.bulkCreate(farmPhotoData);
    logger.info(`Created ${createdFarms.length} farms with photos`);
    
    // Create products for each farm (5 per category)
    const productData = [];
    const productPhotoData = [];
    
    for (const farm of createdFarms) {
      for (const category of productCategories) {
        // Create 5 products per category per farm
        for (let i = 0; i < 5; i++) {
          const productId = uuidv4();
          const product = generateProductData(farm.id, category);
          product.id = productId;
          productData.push(product);
          
          // Create 2 photos for each product
          for (let j = 0; j < 2; j++) {
            productPhotoData.push({
              id: uuidv4(),
              productId,
              url: `https://source.unsplash.com/random/500x500/?${encodeURIComponent(product.name.toLowerCase())},${j}`,
              caption: `${product.name} - ${j === 0 ? 'Main' : 'Detail'} View`,
              isMain: j === 0, // First photo is main
              order: j,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
    }
    
    await Product.bulkCreate(productData);
    await ProductPhoto.bulkCreate(productPhotoData);
    
    logger.info(`Created ${productData.length} products with photos`);
    logger.info('Database seeded successfully!');
    
    // Log credentials for easy access
    logger.info('\nTest Users Created:');
    logger.info('-----------------------------');
    logger.info('Admin: admin@freshfarmily.com / Password123!');
    logger.info('Farmer: farmer@freshfarmily.com / Password123!');
    logger.info('Driver: driver@freshfarmily.com / Password123!');
    logger.info('Consumer: consumer@freshfarmily.com / Password123!');
    logger.info('-----------------------------\n');
    
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Execute the seed function
seedDatabase().then(() => {
  logger.info('Seed script completed');
  process.exit(0);
}).catch(error => {
  logger.error('Seed script failed:', error);
  process.exit(1);
});
