/**
 * Production Seed Script for FreshFarmily
 * 
 * Creates comprehensive test data for all entities using the application's models
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const { sequelize } = require('../src/config/database');

// Import models directly from the application
const db = require('../src/models/index');
const { User, Profile } = db;
const { Farm, FarmPhoto } = db;
const { Product, ProductPhoto, ProductReview } = db;
const { Order, OrderItem } = db;

// Configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';

// Entity counts
const NUM_ADMINS = 1;
const NUM_FARMERS = 5;
const NUM_DRIVERS = 3;
const NUM_CONSUMERS = 10;
const FARMS_PER_FARMER_MIN = 1;
const FARMS_PER_FARMER_MAX = 2;
const PRODUCTS_PER_FARM_MIN = 3;
const PRODUCTS_PER_FARM_MAX = 10;
const PHOTOS_PER_FARM = 3;
const PHOTOS_PER_PRODUCT = 2;
const ORDERS_PER_CONSUMER_MIN = 1;
const ORDERS_PER_CONSUMER_MAX = 5;
const ITEMS_PER_ORDER_MIN = 1;
const ITEMS_PER_ORDER_MAX = 4;

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

// Farm certifications
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

// Store created entities to establish relationships
const createdEntities = {
  admins: [],
  farmers: [],
  drivers: [],
  consumers: [],
  farms: [],
  farmPhotos: [],
  products: [],
  productPhotos: [],
  orders: [],
  orderItems: []
};

// Hash password utility
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Create users with different roles
async function createUsers() {
  console.log('Creating users...');
  
  // Create Admin Users
  for (let i = 0; i < NUM_ADMINS; i++) {
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    const admin = await User.create({
      email: i === 0 ? 'admin@freshfarmily.com' : `admin${i+1}@freshfarmily.com`,
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      firstName: i === 0 ? 'Admin' : faker.person.firstName(),
      lastName: i === 0 ? 'User' : faker.person.lastName()
    });
    
    await Profile.create({
      userId: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phoneNumber: faker.phone.number(),
      profileImage: faker.image.avatar()
    });
    
    createdEntities.admins.push(admin);
    console.log(`Created admin user: ${admin.email}`);
  }
  
  // Create Farmer Users
  for (let i = 0; i < NUM_FARMERS; i++) {
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const farmer = await User.create({
      email: i === 0 ? 'farmer@freshfarmily.com' : `farmer${i+1}@freshfarmily.com`,
      password: hashedPassword,
      role: 'farmer',
      status: 'active',
      emailVerified: true,
      firstName,
      lastName
    });
    
    await Profile.create({
      userId: farmer.id,
      firstName,
      lastName,
      phoneNumber: faker.phone.number(),
      profileImage: faker.image.avatar(),
      bio: faker.lorem.paragraph()
    });
    
    createdEntities.farmers.push(farmer);
    console.log(`Created farmer user: ${farmer.email}`);
  }
  
  // Create Driver Users
  for (let i = 0; i < NUM_DRIVERS; i++) {
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const driver = await User.create({
      email: i === 0 ? 'driver@freshfarmily.com' : `driver${i+1}@freshfarmily.com`,
      password: hashedPassword,
      role: 'driver',
      status: 'active',
      emailVerified: true,
      firstName,
      lastName
    });
    
    await Profile.create({
      userId: driver.id,
      firstName,
      lastName,
      phoneNumber: faker.phone.number(),
      profileImage: faker.image.avatar()
    });
    
    createdEntities.drivers.push(driver);
    console.log(`Created driver user: ${driver.email}`);
  }
  
  // Create Consumer Users
  for (let i = 0; i < NUM_CONSUMERS; i++) {
    const hashedPassword = await hashPassword(DEFAULT_PASSWORD);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const consumer = await User.create({
      email: i === 0 ? 'consumer@freshfarmily.com' : `consumer${i+1}@freshfarmily.com`,
      password: hashedPassword,
      role: 'consumer',
      status: 'active',
      emailVerified: true,
      firstName,
      lastName
    });
    
    await Profile.create({
      userId: consumer.id,
      firstName,
      lastName,
      phoneNumber: faker.phone.number(),
      profileImage: faker.image.avatar(),
      bio: Math.random() > 0.5 ? faker.lorem.paragraph() : null
    });
    
    createdEntities.consumers.push(consumer);
    console.log(`Created consumer user: ${consumer.email}`);
  }
  
  console.log(`Total users created: ${NUM_ADMINS + NUM_FARMERS + NUM_DRIVERS + NUM_CONSUMERS}`);
}

// Create farms for farmers
async function createFarms() {
  console.log('\nCreating farms...');
  
  for (const farmer of createdEntities.farmers) {
    // Each farmer can have 1-2 farms
    const numFarms = getRandomInt(FARMS_PER_FARMER_MIN, FARMS_PER_FARMER_MAX);
    
    for (let i = 0; i < numFarms; i++) {
      const farmName = `${faker.company.name()} Farm`;
      
      // Farm certifications - randomly select 0-3 certifications
      const farmCertifications = Math.random() > 0.2 ? 
        getRandomItems(CERTIFICATIONS, 0, 3) : [];
      
      const farm = await Farm.create({
        farmerId: farmer.id,
        name: farmName,
        description: faker.lorem.paragraph(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state().slice(0, 2),
        zipCode: faker.location.zipCode(),
        phoneNumber: faker.phone.number(),
        email: faker.internet.email(),
        website: Math.random() > 0.5 ? faker.internet.url() : null,
        isVerified: Math.random() > 0.2,
        status: 'active',
        acceptsDelivery: Math.random() > 0.3,
        acceptsPickup: true,
        deliveryRange: Math.random() > 0.3 ? getRandomInt(5, 50) : 25,
        pickupInstructions: Math.random() > 0.5 ? faker.lorem.paragraph() : null,
        latitude: faker.location.latitude(),
        longitude: faker.location.longitude(),
        certifications: JSON.stringify(farmCertifications),
        imageUrl: `https://source.unsplash.com/800x600/?farm,agriculture&random=${Math.random()}`
      });
      
      createdEntities.farms.push(farm);
      console.log(`Created farm: ${farmName}`);
      
      // Add photos to the farm
      for (let j = 0; j < PHOTOS_PER_FARM; j++) {
        const farmPhoto = await FarmPhoto.create({
          farmId: farm.id,
          url: `https://source.unsplash.com/800x600/?farm,agriculture&random=${Math.random()}`,
          isMain: j === 0, // First photo is main
          caption: faker.lorem.sentence(),
          order: j
        });
        
        createdEntities.farmPhotos.push(farmPhoto);
      }
    }
  }
  
  console.log(`Total farms created: ${createdEntities.farms.length}`);
}

// Create products for farms
async function createProducts() {
  console.log('\nCreating products...');
  
  for (const farm of createdEntities.farms) {
    const numProducts = getRandomInt(PRODUCTS_PER_FARM_MIN, PRODUCTS_PER_FARM_MAX);
    
    for (let i = 0; i < numProducts; i++) {
      const category = getRandomItem(PRODUCT_CATEGORIES);
      const isOrganic = Math.random() > 0.5;
      const productName = `${faker.commerce.productAdjective()} ${faker.commerce.product()}`;
      const price = parseFloat((getRandomInt(2, 40) + Math.random()).toFixed(2));
      
      const product = await Product.create({
        farmId: farm.id,
        name: productName,
        description: faker.commerce.productDescription(),
        category,
        subcategory: Math.random() > 0.5 ? faker.commerce.productAdjective() : null,
        price,
        unit: getRandomItem(['lb', 'oz', 'each', 'bunch', 'dozen']),
        quantityAvailable: getRandomInt(0, 100),
        isOrganic,
        isFeatured: Math.random() > 0.8,
        tags: JSON.stringify(getRandomItems(['seasonal', 'bestseller', 'new', 'limited'], 0, 2)),
        imageUrl: `https://source.unsplash.com/800x600/?food,${category.toLowerCase()}&random=${Math.random()}`,
        status: 'active'
      });
      
      createdEntities.products.push(product);
      console.log(`Created product: ${productName}`);
      
      // Add photos to the product
      for (let j = 0; j < PHOTOS_PER_PRODUCT; j++) {
        const productPhoto = await ProductPhoto.create({
          productId: product.id,
          url: `https://source.unsplash.com/800x600/?food,${category.toLowerCase()}&random=${Math.random()}`,
          isPrimary: j === 0,
          caption: Math.random() > 0.3 ? faker.lorem.sentence() : null,
          order: j
        });
        
        createdEntities.productPhotos.push(productPhoto);
      }
      
      // Add some reviews to about 30% of products
      if (Math.random() > 0.7 && createdEntities.consumers.length > 0) {
        const numReviews = getRandomInt(1, 3);
        const reviewConsumers = getRandomItems(createdEntities.consumers, numReviews, numReviews);
        
        for (const consumer of reviewConsumers) {
          await ProductReview.create({
            productId: product.id,
            userId: consumer.id,
            rating: getRandomInt(3, 5), // Mostly positive reviews
            review: faker.lorem.paragraph(),
            createdAt: new Date(Date.now() - getRandomInt(1, 90) * 24 * 60 * 60 * 1000) // Random date in past 90 days
          });
        }
      }
    }
  }
  
  console.log(`Total products created: ${createdEntities.products.length}`);
}

// Create orders for consumers
async function createOrders() {
  console.log('\nCreating orders...');
  
  // Order statuses
  const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'ready', 'out_for_delivery', 'delivered', 'picked_up', 'cancelled', 'refunded'];
  
  for (const consumer of createdEntities.consumers) {
    // Each consumer can have 1-5 orders
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
        deliveryState: deliveryMethod === 'delivery' ? faker.location.state().slice(0, 2) : null,
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
      if (farmProducts.length === 0) {
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
        
        const orderItem = await OrderItem.create({
          orderId: order.id,
          productId: product.id,
          quantity,
          price,
          total,
          name: product.name, // Store product name at time of order
          notes: Math.random() > 0.9 ? faker.lorem.sentence() : null,
        });
        
        createdEntities.orderItems.push(orderItem);
      }
      
      // Update order totals
      const taxAmount = Math.round(subTotal * 0.08 * 100) / 100; // 8% tax
      const totalAmount = subTotal + taxAmount + order.deliveryFee - order.discountAmount;
      
      await order.update({
        subTotal,
        taxAmount,
        totalAmount,
      });
      
      createdEntities.orders.push(order);
      console.log(`Created order #${orderNumber} for ${consumer.email}`);
    }
  }
  
  console.log(`Total orders created: ${createdEntities.orders.length}`);
}

// Main function to run the seed
async function seedProductionData() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!');
    
    // Check if we should reset the database
    if (process.env.SEED_RESET_DB === 'true') {
      console.warn('\n!!! WARNING: RESETTING DATABASE - all existing data will be lost! !!!');
      await sequelize.sync({ force: true });
      console.log('Database reset and recreated.');
    } else {
      // Just sync models without force
      await sequelize.sync();
      console.log('Database schema synchronized.');
    }
    
    // Create all entities with proper relationships
    await createUsers();
    await createFarms();
    await createProducts();
    await createOrders();
    
    console.log('\n\u2705 Database successfully seeded with production test data!');
    console.log('\nSummary of created entities:');
    console.log(`- ${createdEntities.admins.length} admin users`);
    console.log(`- ${createdEntities.farmers.length} farmer users`);
    console.log(`- ${createdEntities.drivers.length} driver users`);
    console.log(`- ${createdEntities.consumers.length} consumer users`);
    console.log(`- ${createdEntities.farms.length} farms`);
    console.log(`- ${createdEntities.products.length} products`);
    console.log(`- ${createdEntities.orders.length} orders`);
    
    console.log('\nLogin credentials for testing:');
    console.log('Admin: admin@freshfarmily.com / password123');
    console.log('Farmer: farmer@freshfarmily.com / password123');
    console.log('Driver: driver@freshfarmily.com / password123');
    console.log('Consumer: consumer@freshfarmily.com / password123');
    
  } catch (error) {
    console.error('\n\u274c Error seeding database:', error);
    console.error(error.stack);
  } finally {
    // Close the connection
    process.exit(0);
  }
}

// Run the seed script
seedProductionData();
