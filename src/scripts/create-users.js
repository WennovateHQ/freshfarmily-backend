/**
 * Create Test Users Script
 * 
 * This script creates test users for the FreshFarmily application
 * with different roles for testing purposes.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const { User, Profile } = require('../models');
const { authLogger } = require('../utils/logger');

// Test users data
const testUsers = [
  {
    email: 'consumer@freshfarmily.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Consumer',
    role: 'consumer',
    status: 'active',
    emailVerified: true,
    profile: {
      address: '123 Fresh Street',
      city: 'Farmville',
      state: 'CA',
      zipCode: '94103',
      phone: '555-123-4567',
      bio: 'I love fresh local produce!'
    }
  },
  {
    email: 'farmer@freshfarmily.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Farmer',
    role: 'farmer',
    status: 'active',
    emailVerified: true,
    profile: {
      address: '456 Farm Road',
      city: 'Farmville',
      state: 'CA',
      zipCode: '94103',
      phone: '555-987-6543',
      bio: 'Growing organic vegetables since 2010.'
    }
  }
];

/**
 * Create a test user in the database
 */
async function createTestUser(userData) {
  const transaction = await sequelize.transaction();
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ 
      where: { email: userData.email },
      transaction
    });
    
    if (existingUser) {
      console.log(`User ${userData.email} already exists with ID: ${existingUser.id}`);
      await transaction.rollback();
      return existingUser;
    }
    
    // Generate hashed password
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    // Create the user
    const userId = uuidv4();
    const newUser = await User.create({
      id: userId,
      email: userData.email,
      password: hashedPassword,
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: userData.role,
      status: userData.status,
      emailVerified: userData.emailVerified
    }, { transaction });
    
    // Create user profile
    await Profile.create({
      id: uuidv4(),
      userId: userId,
      address: userData.profile.address,
      city: userData.profile.city,
      state: userData.profile.state,
      zipCode: userData.profile.zipCode,
      phone: userData.profile.phone,
      bio: userData.profile.bio
    }, { transaction });
    
    // Commit transaction
    await transaction.commit();
    
    console.log(`User ${userData.email} created successfully with ID: ${newUser.id}`);
    return newUser;
  } catch (error) {
    // Rollback transaction on error
    await transaction.rollback();
    console.error(`Error creating user ${userData.email}:`, error);
    throw error;
  }
}

/**
 * Main function to create all test users
 */
async function createAllTestUsers() {
  try {
    console.log('Starting test user creation script...');
    
    // Verify database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Create all test users
    const results = [];
    for (const userData of testUsers) {
      try {
        const user = await createTestUser(userData);
        results.push({
          email: userData.email,
          id: user.id,
          role: userData.role,
          success: true
        });
      } catch (error) {
        results.push({
          email: userData.email,
          success: false,
          error: error.message
        });
      }
    }
    
    // Display results
    console.log('\n=== User Creation Results ===');
    for (const result of results) {
      if (result.success) {
        console.log(`✅ ${result.email} (${result.role}) - ID: ${result.id}`);
      } else {
        console.log(`❌ ${result.email} - Error: ${result.error}`);
      }
    }
    
    console.log('\n=== Login Credentials ===');
    for (const user of testUsers) {
      console.log(`Email: ${user.email}\nPassword: ${user.password}\nRole: ${user.role}\n`);
    }
    
  } catch (error) {
    console.error('Failed to create test users:', error);
  } finally {
    // Close database connection
    await sequelize.close();
    process.exit(0);
  }
}

// Run the script
createAllTestUsers();
