/**
 * Simple Seed Script for FreshFarmily
 * 
 * Creates essential data for testing in a step-by-step process
 */

require('dotenv').config();
const { faker } = require('@faker-js/faker');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Set up a direct database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: msg => console.log(msg)
  }
);

// Define models directly to avoid association issues
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  roleId: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'consumer'
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  emailVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

const Profile = sequelize.define('Profile', {
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
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profileImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

const Farm = sequelize.define('Farm', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  farmerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  state: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zipCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  website: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  acceptsDelivery: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  acceptsPickup: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  deliveryRange: {
    type: DataTypes.INTEGER,
    defaultValue: 25
  },
  pickupInstructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  latitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitude: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  certifications: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  farmId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Farms',
      key: 'id'
    }
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
    allowNull: true
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
    allowNull: true
  },
  quantityAvailable: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isOrganic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  }
});

// Seed configuration
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';
const NUM_FARMS = 3; // Start with a small number
const PRODUCTS_PER_FARM = 2;

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

// Helper functions
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
const getRandomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

// Hash password function
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Create users with different roles
async function createUsers() {
  console.log('Creating users...');
  
  const users = {
    admin: null,
    farmers: [],
    consumers: []
  };
  
  // Create admin user
  const adminPassword = await hashPassword(DEFAULT_PASSWORD);
  users.admin = await User.create({
    email: 'admin@freshfarmily.com',
    password: adminPassword,
    roleId: 'admin',
    status: 'active',
    emailVerified: true,
    firstName: 'Admin',
    lastName: 'User'
  });
  
  await Profile.create({
    userId: users.admin.id,
    firstName: 'Admin',
    lastName: 'User',
    phoneNumber: faker.phone.number()
  });
  
  console.log(`Created admin user: ${users.admin.email}`);
  
  // Create 3 farmers
  for (let i = 0; i < 3; i++) {
    const farmerPassword = await hashPassword(DEFAULT_PASSWORD);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const farmer = await User.create({
      email: `farmer${i+1}@freshfarmily.com`,
      password: farmerPassword,
      roleId: 'farmer',
      status: 'active',
      emailVerified: true,
      firstName,
      lastName
    });
    
    await Profile.create({
      userId: farmer.id,
      firstName,
      lastName,
      phoneNumber: faker.phone.number()
    });
    
    users.farmers.push(farmer);
    console.log(`Created farmer user: ${farmer.email}`);
  }
  
  // Create 5 consumers
  for (let i = 0; i < 5; i++) {
    const consumerPassword = await hashPassword(DEFAULT_PASSWORD);
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    const consumer = await User.create({
      email: `consumer${i+1}@freshfarmily.com`,
      password: consumerPassword,
      roleId: 'consumer',
      status: 'active',
      emailVerified: true,
      firstName,
      lastName
    });
    
    await Profile.create({
      userId: consumer.id,
      firstName,
      lastName,
      phoneNumber: faker.phone.number()
    });
    
    users.consumers.push(consumer);
    console.log(`Created consumer user: ${consumer.email}`);
  }
  
  return users;
}

// Create farms for farmers
async function createFarms(farmers) {
  console.log('\nCreating farms...');
  
  const farms = [];
  
  for (const farmer of farmers) {
    // Each farmer can have 1-2 farms
    const numFarms = getRandomInt(1, 2);
    
    for (let i = 0; i < numFarms; i++) {
      const farmName = `${faker.company.name()} Farm`;
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
        certifications: JSON.stringify(['USDA Organic', 'Non-GMO']),
        imageUrl: 'https://source.unsplash.com/800x600/?farm'
      });
      
      farms.push(farm);
      console.log(`Created farm: ${farmName}`);
    }
  }
  
  return farms;
}

// Create products for farms
async function createProducts(farms) {
  console.log('\nCreating products...');
  
  const products = [];
  
  for (const farm of farms) {
    for (let i = 0; i < PRODUCTS_PER_FARM; i++) {
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
        tags: JSON.stringify(['seasonal', 'bestseller']),
        imageUrl: 'https://source.unsplash.com/800x600/?food',
        status: 'active'
      });
      
      products.push(product);
      console.log(`Created product: ${productName}`);
    }
  }
  
  return products;
}

// Main seeding function
async function seed() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // Drop and recreate tables
    console.log('Recreating database tables...');
    await sequelize.sync({ force: true });
    console.log('Database tables created successfully!\n');
    
    // Create users
    const users = await createUsers();
    
    // Create farms
    const farms = await createFarms(users.farmers);
    
    // Create products
    const products = await createProducts(farms);
    
    console.log('\n✅ Database seeded successfully!');
    console.log(`Created ${users.farmers.length} farmers, ${farms.length} farms, and ${products.length} products.`);
    console.log('\nLogin credentials:');
    console.log('Admin: admin@freshfarmily.com / password123');
    console.log('Farmer: farmer1@freshfarmily.com / password123');
    console.log('Consumer: consumer1@freshfarmily.com / password123');
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the seed script
seed();
