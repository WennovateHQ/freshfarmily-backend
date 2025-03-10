/**
 * Database seed script for FreshFarmily
 * 
 * This script initializes the database with test data
 * including users with proper roles, farms, products, and orders.
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const { User, Profile } = require('./src/models/user');
const { Farm } = require('./src/models/farm');
const { Product } = require('./src/models/product');
const { Order, OrderItem } = require('./src/models/order');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const logger = require('./src/utils/logger');

// Debug mode to see detailed output
const DEBUG = true;

// Print database information
async function printDatabaseInfo() {
  if (!DEBUG) return;
  
  try {
    // Check if Users table exists
    const tableCheck = await sequelize.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables 
         WHERE table_schema = 'public' 
         AND table_name = 'Users'
       );`,
      { plain: true }
    );
    
    logger.info(`Users table exists: ${tableCheck.exists}`);
    
    // Count rows in Users table
    if (tableCheck.exists) {
      const userCount = await sequelize.query(
        `SELECT COUNT(*) FROM "Users";`,
        { plain: true }
      );
      
      logger.info(`Users count: ${userCount.count}`);
      
      // Show users
      const users = await sequelize.query(
        `SELECT id, email, role, status FROM "Users" LIMIT 5;`
      );
      
      if (users[0].length > 0) {
        logger.info(`First 5 users in database:`);
        users[0].forEach(u => {
          logger.info(`- ${u.email} (${u.role}): ${u.status}`);
        });
      } else {
        logger.info(`No users found in database`);
      }
    }
  } catch (error) {
    logger.error(`Error checking database: ${error.message}`);
  }
}

async function seedDatabase() {
  logger.info('Starting database seed process...');
  
  // Print database info before seeding
  await printDatabaseInfo();
  
  try {
    // First sync all models with the database (create tables)
    logger.info('Syncing database models...');
    
    // Use force: true to recreate the tables
    await sequelize.sync({ force: true });
    
    logger.info('Database models synced successfully.');
    
    // Create appropriate test data for different roles
    logger.info('Creating test users with proper role-based permissions...');
    
    // Check if users already exist before creating them
    const adminEmail = 'admin@freshfarmily.com';
    const farmerEmail = 'farmer@freshfarmily.com';
    const driverEmail = 'driver@freshfarmily.com';
    const consumerEmail = 'consumer@freshfarmily.com';
    
    // Find existing users
    const existingAdmin = await User.findOne({ where: { email: adminEmail } });
    const existingFarmer = await User.findOne({ where: { email: farmerEmail } });
    const existingDriver = await User.findOne({ where: { email: driverEmail } });
    const existingConsumer = await User.findOne({ where: { email: consumerEmail } });
    
    // Create admin user
    let adminUser;
    if (!existingAdmin) {
      adminUser = await User.create({
        id: uuidv4(),
        email: adminEmail,
        password: 'admin123',  
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: ['read', 'write', 'update', 'delete', 'admin'],
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info(`Created admin user: ${adminEmail}`);
    } else {
      adminUser = existingAdmin;
      logger.info(`Admin user ${adminEmail} already exists`);
    }
    
    // Create farmer user
    let farmerUser;
    if (!existingFarmer) {
      farmerUser = await User.create({
        id: uuidv4(),
        email: farmerEmail,
        password: 'farmer123',  
        firstName: 'Farmer',
        lastName: 'User',
        role: 'farmer',
        permissions: ['read', 'write', 'update', 'delete_own'],
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info(`Created farmer user: ${farmerEmail}`);
    } else {
      farmerUser = existingFarmer;
      logger.info(`Farmer user ${farmerEmail} already exists`);
    }
    
    // Create driver user
    let driverUser;
    if (!existingDriver) {
      driverUser = await User.create({
        id: uuidv4(),
        email: driverEmail,
        password: 'driver123',  
        firstName: 'Driver',
        lastName: 'User',
        role: 'driver',
        permissions: ['read', 'update_delivery'],
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info(`Created driver user: ${driverEmail}`);
    } else {
      driverUser = existingDriver;
      logger.info(`Driver user ${driverEmail} already exists`);
    }
    
    // Create consumer user
    let consumerUser;
    if (!existingConsumer) {
      consumerUser = await User.create({
        id: uuidv4(),
        email: consumerEmail,
        password: 'consumer123',  
        firstName: 'Consumer',
        lastName: 'User',
        role: 'consumer',
        permissions: ['read', 'create_order'],
        status: 'active',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info(`Created consumer user: ${consumerEmail}`);
    } else {
      consumerUser = existingConsumer;
      logger.info(`Consumer user ${consumerEmail} already exists`);
    }
    
    // Seed farms
    logger.info('Creating test farms...');
    const farms = [
      {
        id: uuidv4(),
        name: 'Green Acres Farm',
        description: 'A small family-owned organic farm',
        address: '123 Farm Rd',
        city: 'Farmville',
        state: 'CA',
        zipCode: '95555',
        logo: 'https://example.com/farm-logo.jpg',
        status: 'active',
        isVerified: true,
        farmerId: farmerUser.id,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Find existing farms or create new ones
    const createdFarms = [];
    for (const farm of farms) {
      const existingFarm = await Farm.findOne({ where: { name: farm.name } });
      if (existingFarm) {
        logger.info(`Farm already exists: ${farm.name}`);
        createdFarms.push(existingFarm);
      } else {
        try {
          const createdFarm = await Farm.create(farm);
          createdFarms.push(createdFarm);
          logger.info(`Created farm: ${farm.name}`);
        } catch (error) {
          logger.error(`Error creating farm ${farm.name}: ${error.message}`);
        }
      }
    }
    
    if (createdFarms.length === 0) {
      logger.error('No farms were created or found. Stopping seed process.');
      return false;
    }
    
    // Seed products
    logger.info('Creating test products...');
    const products = [
      {
        id: uuidv4(),
        name: 'Organic Apples',
        description: 'Fresh, crisp organic apples',
        price: 3.99,
        unit: 'lb',
        quantityAvailable: 50,
        isOrganic: true,
        farmId: createdFarms[0].id,
        category: 'Fruits',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: uuidv4(),
        name: 'Farm Fresh Eggs',
        description: 'Cage-free, pasture-raised chicken eggs',
        price: 4.99,
        unit: 'dozen',
        quantityAvailable: 25,
        isOrganic: true,
        farmId: createdFarms[0].id,
        category: 'Dairy & Eggs',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
    
    // Find existing products or create new ones
    const createdProducts = [];
    for (const product of products) {
      const existingProduct = await Product.findOne({ 
        where: { 
          name: product.name,
          farmId: product.farmId
        } 
      });
      
      if (existingProduct) {
        logger.info(`Product already exists: ${product.name}`);
        createdProducts.push(existingProduct);
      } else {
        try {
          const createdProduct = await Product.create(product);
          createdProducts.push(createdProduct);
          logger.info(`Created product: ${product.name}`);
        } catch (error) {
          logger.error(`Error creating product ${product.name}: ${error.message}`);
        }
      }
    }
    
    if (createdProducts.length === 0) {
      logger.error('No products were created or found. Stopping seed process.');
      return false;
    }
    
    // Create a test order
    logger.info('Creating test order...');
    
    // Check if order already exists
    const orderNumber = 'ORD-' + Math.floor(10000000 + Math.random() * 90000000);
    const existingOrder = await Order.findOne({
      where: { userId: consumerUser.id }
    });
    
    if (existingOrder) {
      logger.info(`Order already exists for consumer user ${consumerUser.email}`);
    } else {
      try {
        const order = await Order.create({
          id: uuidv4(),
          userId: consumerUser.id,
          orderNumber: orderNumber,
          status: 'confirmed',
          totalAmount: 8.98,
          subTotal: 7.98,
          taxAmount: 1.00,
          deliveryFee: 0,
          deliveryMethod: 'pickup',
          paymentMethod: 'card',
          paymentStatus: 'paid',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        // Create order items
        await OrderItem.create({
          id: uuidv4(),
          orderId: order.id,
          productId: createdProducts[0].id,
          farmId: createdFarms[0].id,
          productName: createdProducts[0].name,
          farmName: createdFarms[0].name,
          quantity: 2,
          unit: createdProducts[0].unit,
          unitPrice: createdProducts[0].price,
          totalPrice: createdProducts[0].price * 2,
          status: 'confirmed',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        logger.info(`Created order: ${order.orderNumber}`);
      } catch (error) {
        logger.error(`Error creating order: ${error.message}`);
      }
    }
    
    logger.info('✅ Database seed completed successfully!');
    logger.info('');
    logger.info('Test users created:');
    logger.info(`- Admin: admin@freshfarmily.com / admin123`);
    logger.info(`- Farmer: farmer@freshfarmily.com / farmer123`);
    logger.info(`- Driver: driver@freshfarmily.com / driver123`);
    logger.info(`- Consumer: consumer@freshfarmily.com / consumer123`);
    logger.info('');
    logger.info('Test farm, product, and order have been created.');
    
    // Print database info after seeding
    await printDatabaseInfo();
    
    logger.info('Database seed process completed.');
    return true;
  } catch (error) {
    logger.error(`Error seeding database: ${error.message}`);
    logger.error(error.stack);
    return false;
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Function to check database connection
async function checkDatabaseConnection() {
  try {
    logger.info('Testing database connection...');
    
    // Get database connection info
    const dbName = process.env.DB_NAME || 'freshfarmily';
    const dbUser = process.env.DB_USER || 'postgres';
    const dbHost = process.env.DB_HOST || 'localhost';
    
    logger.info(`Database: ${dbName}, User: ${dbUser}, Host: ${dbHost}`);
    
    // Test connection
    await sequelize.authenticate();
    logger.info('✅ Database connection has been established successfully.');
    
    return true;
  } catch (error) {
    logger.error('❌ Unable to connect to the database:');
    logger.error(error.message);
    return false;
  }
}

// Run the seeding process
async function run() {
  // First check database connection
  const dbConnected = await checkDatabaseConnection();
  if (!dbConnected) {
    logger.error('Database connection failed. Please check your connection settings.');
    process.exit(1);
  }
  
  // Proceed with seeding
  const success = await seedDatabase();
  
  if (success) {
    logger.info('Seed process completed successfully.');
    process.exit(0);
  } else {
    logger.error('Seed process failed.');
    process.exit(1);
  }
}

run();
