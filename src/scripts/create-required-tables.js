/**
 * Create Required Tables Script
 * 
 * This script creates all required tables with proper schema definitions
 * to ensure a clean, functioning database for FreshFarmily.
 */

const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

async function createRequiredTables() {
  try {
    logger.info('Starting required tables creation script...');
    
    // 1. Create users table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        "firstName" VARCHAR(255),
        "lastName" VARCHAR(255),
        role VARCHAR(50) DEFAULT 'consumer',
        status VARCHAR(50) DEFAULT 'pending',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Users table created or confirmed');
    
    // 2. Create profiles table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY,
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        address VARCHAR(255),
        city VARCHAR(255),
        state VARCHAR(255),
        "zipCode" VARCHAR(255),
        phone VARCHAR(255),
        "bio" TEXT,
        "avatarUrl" VARCHAR(255),
        preferences JSONB,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Profiles table created or confirmed');
    
    // 3. Create farms table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS farms (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        address VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        "zipCode" VARCHAR(255) NOT NULL,
        "farmerId" UUID REFERENCES users(id),
        status VARCHAR(50) DEFAULT 'pending',
        "logoUrl" VARCHAR(255),
        "bannerUrl" VARCHAR(255),
        "contactEmail" VARCHAR(255),
        "contactPhone" VARCHAR(255),
        "website" VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Farms table created or confirmed');
    
    // 4. Create farm_photos table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS farm_photos (
        id UUID PRIMARY KEY,
        "farmId" UUID REFERENCES farms(id) ON DELETE CASCADE,
        url VARCHAR(255) NOT NULL,
        caption VARCHAR(255),
        "sortOrder" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Farm_photos table created or confirmed');
    
    // 5. Create products table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        "unitType" VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        "subcategory" VARCHAR(100),
        "farmId" UUID REFERENCES farms(id) ON DELETE CASCADE,
        inventory INTEGER DEFAULT 0,
        "isOrganic" BOOLEAN DEFAULT false,
        "isAvailable" BOOLEAN DEFAULT true,
        "mainImageUrl" VARCHAR(255),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Products table created or confirmed');
    
    // Check if we need to create order status enum
    try {
      const [enumTypes] = await sequelize.query(`
        SELECT typname FROM pg_type WHERE typname = 'enum_orders_status';
      `);
      
      if (!enumTypes || enumTypes.length === 0) {
        // Create the enum type for order status
        await sequelize.query(`
          CREATE TYPE enum_orders_status AS ENUM (
            'pending', 'confirmed', 'processing', 'ready', 
            'out_for_delivery', 'delivered', 'picked_up', 'cancelled'
          );
        `);
        logger.info('Created order status enum type');
      } else {
        // Enum exists, check if it has all values
        const [enumValues] = await sequelize.query(`
          SELECT e.enumlabel
          FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'enum_orders_status';
        `);
        
        // Check for required values
        const requiredValues = ['pending', 'confirmed', 'processing', 'ready', 
                                'out_for_delivery', 'delivered', 'picked_up', 'cancelled'];
        const existingValues = enumValues.map(v => v.enumlabel);
        
        for (const value of requiredValues) {
          if (!existingValues.includes(value)) {
            try {
              await sequelize.query(`ALTER TYPE enum_orders_status ADD VALUE '${value}';`);
              logger.info(`Added missing enum value: ${value}`);
            } catch (err) {
              logger.warn(`Could not add enum value ${value}: ${err.message}`);
            }
          }
        }
      }
    } catch (enumError) {
      logger.error(`Error handling order status enum: ${enumError.message}`);
    }
    
    // 6. Create orders table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY,
        "orderNumber" VARCHAR(255) NOT NULL UNIQUE,
        status VARCHAR(50) DEFAULT 'pending',
        "paymentStatus" VARCHAR(50) DEFAULT 'pending',
        "totalAmount" DECIMAL(10, 2) DEFAULT 0,
        "userId" UUID REFERENCES users(id),
        "shippingAddress" JSONB,
        "deliveryDate" TIMESTAMP WITH TIME ZONE,
        "paymentMethod" VARCHAR(50),
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Orders table created or confirmed');
    
    // 7. Create order_items table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY,
        "orderId" UUID REFERENCES orders(id) ON DELETE CASCADE,
        "productId" UUID REFERENCES products(id),
        quantity INTEGER NOT NULL,
        "unitPrice" DECIMAL(10, 2) NOT NULL,
        "totalPrice" DECIMAL(10, 2) NOT NULL,
        notes TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);
    logger.info('Order_items table created or confirmed');
    
    // Check if we have any users
    const [userCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM users;
    `);
    
    // Create test users if there are none
    if (parseInt(userCount[0].count) === 0) {
      logger.info('Creating test users for development...');
      
      // Create a farmer user
      const farmerId = uuidv4();
      const farmerPassword = await bcrypt.hash('farmer123', 10);
      
      await sequelize.query(`
        INSERT INTO users (
          id, email, password, "firstName", "lastName", 
          role, status, "createdAt", "updatedAt"
        ) VALUES (
          :id, 'farmer@freshfarmily.com', :password, 'Farm', 'Owner', 
          'farmer', 'active', NOW(), NOW()
        )
      `, {
        replacements: { 
          id: farmerId,
          password: farmerPassword
        }
      });
      
      // Create profile for farmer
      const farmerProfileId = uuidv4();
      await sequelize.query(`
        INSERT INTO profiles (
          id, "userId", address, city, state, "zipCode", 
          phone, "createdAt", "updatedAt"
        ) VALUES (
          :id, :userId, '123 Farm Road', 'Farmville', 'CA', '94105',
          '555-123-4567', NOW(), NOW()
        )
      `, {
        replacements: {
          id: farmerProfileId,
          userId: farmerId
        }
      });
      
      // Create a farm for the farmer
      const farmId = uuidv4();
      await sequelize.query(`
        INSERT INTO farms (
          id, name, description, address, city, state, "zipCode",
          "farmerId", status, "createdAt", "updatedAt"
        ) VALUES (
          :id, 'Fresh Organic Farm', 'We grow the freshest organic produce', 
          '123 Farm Road', 'Farmville', 'CA', '94105',
          :farmerId, 'active', NOW(), NOW()
        )
      `, {
        replacements: {
          id: farmId,
          farmerId: farmerId
        }
      });
      
      // Create some products for the farm
      const productNames = ['Organic Apples', 'Fresh Lettuce', 'Carrots', 'Tomatoes'];
      for (let i = 0; i < productNames.length; i++) {
        const productId = uuidv4();
        await sequelize.query(`
          INSERT INTO products (
            id, name, description, price, "unitType", 
            category, "farmId", inventory, "isOrganic", 
            "isAvailable", "createdAt", "updatedAt"
          ) VALUES (
            :id, :name, 'Fresh from our farm', :price, 'lb',
            'Produce', :farmId, :inventory, true,
            true, NOW(), NOW()
          )
        `, {
          replacements: {
            id: productId,
            name: productNames[i],
            price: (2.99 + i).toFixed(2),
            farmId: farmId,
            inventory: 100 + (i * 10)
          }
        });
      }
      
      // Create a consumer user
      const consumerId = uuidv4();
      const consumerPassword = await bcrypt.hash('consumer123', 10);
      
      await sequelize.query(`
        INSERT INTO users (
          id, email, password, "firstName", "lastName", 
          role, status, "createdAt", "updatedAt"
        ) VALUES (
          :id, 'consumer@freshfarmily.com', :password, 'Happy', 'Customer', 
          'consumer', 'active', NOW(), NOW()
        )
      `, {
        replacements: { 
          id: consumerId,
          password: consumerPassword
        }
      });
      
      // Create profile for consumer
      const consumerProfileId = uuidv4();
      await sequelize.query(`
        INSERT INTO profiles (
          id, "userId", address, city, state, "zipCode", 
          phone, "createdAt", "updatedAt"
        ) VALUES (
          :id, :userId, '456 Main Street', 'San Francisco', 'CA', '94110',
          '555-987-6543', NOW(), NOW()
        )
      `, {
        replacements: {
          id: consumerProfileId,
          userId: consumerId
        }
      });
      
      logger.info('Test users created successfully:');
      logger.info('Farmer: farmer@freshfarmily.com / farmer123');
      logger.info('Consumer: consumer@freshfarmily.com / consumer123');
    } else {
      logger.info(`Found ${userCount[0].count} existing users, skipping test user creation`);
    }
    
    logger.info('All required tables created successfully');
  } catch (error) {
    logger.error(`Error creating required tables: ${error.message}`);
    console.error(error);
  } finally {
    // Don't close the connection
    logger.info('Script completed.');
  }
}

// Run the script
createRequiredTables();
