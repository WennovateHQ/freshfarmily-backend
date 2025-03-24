/**
 * Fix Authentication Models and Create Test Users
 * 
 * This script does the following:
 * 1. Adds firstName and lastName to the Profile model if missing
 * 2. Properly syncs the database models
 * 3. Creates test users with correct structure
 */

require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
const { sequelize } = require('../src/config/database');

// Import models
const { User, Profile } = require('../src/models/user');

// Initialize models and associations
require('../src/models/index');

// Role permissions
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'update', 'delete', 'admin'],
  farmer: ['read', 'write', 'update', 'delete_own'],
  driver: ['read', 'update_delivery'],
  consumer: ['read', 'create_order']
};

// Password settings
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = 'password123';

async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function fixModelsAndCreateUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // Check if Profile model needs firstName and lastName fields
    console.log('Checking Profile model structure...');
    const profileAttributes = Profile.rawAttributes;
    let modelUpdated = false;
    
    // Check if we need to add firstName to Profile
    if (!profileAttributes.firstName) {
      console.log('Adding firstName field to Profile model...');
      await sequelize.queryInterface.addColumn('Profiles', 'firstName', {
        type: DataTypes.STRING,
        allowNull: true
      });
      modelUpdated = true;
    }
    
    // Check if we need to add lastName to Profile
    if (!profileAttributes.lastName) {
      console.log('Adding lastName field to Profile model...');
      await sequelize.queryInterface.addColumn('Profiles', 'lastName', {
        type: DataTypes.STRING,
        allowNull: true
      });
      modelUpdated = true;
    }
    
    // Check if we need to add phoneNumber to Profile
    if (!profileAttributes.phoneNumber && !profileAttributes.phone) {
      console.log('Adding phoneNumber field to Profile model...');
      await sequelize.queryInterface.addColumn('Profiles', 'phoneNumber', {
        type: DataTypes.STRING,
        allowNull: true
      });
      modelUpdated = true;
    }
    
    if (modelUpdated) {
      console.log('Profile model updated. Need to refresh models...');
      // We would typically need to restart the app for model changes to take effect
      // For our script, we can just reload the models
    } else {
      console.log('Profile model structure is already correct.');
    }
    
    // Now create test users
    console.log('\nCreating test users...');
    
    // Create admin user
    const hashedAdminPassword = await hashPassword(DEFAULT_PASSWORD);
    let admin = await User.findOne({ where: { email: 'admin@freshfarmily.com' } });
    
    if (!admin) {
      console.log('Creating admin user...');
      admin = await User.create({
        email: 'admin@freshfarmily.com',
        password: hashedAdminPassword,
        role: 'admin',
        firstName: 'Admin',
        lastName: 'User',
        status: 'active',
        emailVerified: true,
        permissions: JSON.stringify(ROLE_PERMISSIONS.admin)
      });
      
      // Check if firstName and lastName are in Profile
      const usePhoneField = profileAttributes.phone && !profileAttributes.phoneNumber;
      
      if (profileAttributes.firstName && profileAttributes.lastName) {
        await Profile.create({
          userId: admin.id,
          firstName: 'Admin',
          lastName: 'User',
          [usePhoneField ? 'phone' : 'phoneNumber']: '555-123-4567'
        });
      } else {
        // Create with only the fields we know exist
        await Profile.create({
          userId: admin.id,
          [usePhoneField ? 'phone' : 'phoneNumber']: '555-123-4567'
        });
      }
      
      console.log(`Created admin user with ID: ${admin.id}`);
    } else {
      console.log(`Admin user already exists with ID: ${admin.id}`);
    }
    
    // Create consumer user
    const hashedConsumerPassword = await hashPassword(DEFAULT_PASSWORD);
    let consumer = await User.findOne({ where: { email: 'consumer@freshfarmily.com' } });
    
    if (!consumer) {
      console.log('Creating consumer user...');
      consumer = await User.create({
        email: 'consumer@freshfarmily.com',
        password: hashedConsumerPassword,
        role: 'consumer',
        firstName: 'Consumer',
        lastName: 'Test',
        status: 'active',
        emailVerified: true,
        permissions: JSON.stringify(ROLE_PERMISSIONS.consumer)
      });
      
      // Check if firstName and lastName are in Profile
      const usePhoneField = profileAttributes.phone && !profileAttributes.phoneNumber;
      
      if (profileAttributes.firstName && profileAttributes.lastName) {
        await Profile.create({
          userId: consumer.id,
          firstName: 'Consumer',
          lastName: 'Test',
          [usePhoneField ? 'phone' : 'phoneNumber']: '555-987-6543'
        });
      } else {
        // Create with only the fields we know exist
        await Profile.create({
          userId: consumer.id,
          [usePhoneField ? 'phone' : 'phoneNumber']: '555-987-6543'
        });
      }
      
      console.log(`Created consumer user with ID: ${consumer.id}`);
    } else {
      console.log(`Consumer user already exists with ID: ${consumer.id}`);
    }
    
    // Verify users exist in the database
    console.log('\nVerifying users in database:');
    const adminCheck = await User.findOne({ 
      where: { email: 'admin@freshfarmily.com' },
      include: [{ model: Profile, as: 'Profile' }]
    });
    
    const consumerCheck = await User.findOne({ 
      where: { email: 'consumer@freshfarmily.com' },
      include: [{ model: Profile, as: 'Profile' }]
    });
    
    console.log(`Admin user exists: ${!!adminCheck}`);
    if (adminCheck) {
      console.log(`Admin ID: ${adminCheck.id}`);
      console.log(`Admin has Profile: ${!!adminCheck.Profile}`);
      if (adminCheck.Profile) {
        console.log(`Profile fields: ${Object.keys(adminCheck.Profile.dataValues).join(', ')}`);
      }
    }
    
    console.log(`Consumer user exists: ${!!consumerCheck}`);
    if (consumerCheck) {
      console.log(`Consumer ID: ${consumerCheck.id}`);
      console.log(`Consumer has Profile: ${!!consumerCheck.Profile}`);
      if (consumerCheck.Profile) {
        console.log(`Profile fields: ${Object.keys(consumerCheck.Profile.dataValues).join(', ')}`);
      }
    }
    
    // Create a direct test user account for authentication testing
    const testUser = {
      email: 'test@example.com',
      password: 'password123'
    };
    
    let directTestUser = await User.findOne({ where: { email: testUser.email } });
    
    if (!directTestUser) {
      console.log('\nCreating a direct test user for authentication testing...');
      directTestUser = await User.create({
        email: testUser.email,
        password: await hashPassword(testUser.password),
        role: 'consumer',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        emailVerified: true,
        permissions: JSON.stringify(ROLE_PERMISSIONS.consumer)
      });
      
      // Create minimal profile
      await Profile.create({
        userId: directTestUser.id
      });
      
      console.log(`Created direct test user: ${testUser.email} / ${testUser.password}`);
    } else {
      console.log(`\nDirect test user already exists: ${testUser.email} / ${testUser.password}`);
    }
    
    // Try manual authentication
    console.log('\nAttempting manual password verification:');
    const dbUsers = await User.findAll();
    
    for (const user of dbUsers) {
      const isValid = await bcrypt.compare(DEFAULT_PASSWORD, user.password);
      console.log(`${user.email}: Password valid = ${isValid}`);
    }
    
    if (adminCheck && consumerCheck) {
      console.log('\n\u2705 User creation and verification complete!');
      console.log('\nLogin credentials:');
      console.log('- Admin: admin@freshfarmily.com / password123');
      console.log('- Consumer: consumer@freshfarmily.com / password123');
      console.log('- Test: test@example.com / password123');
      console.log('\nNOTE: Since we may have updated the database structure,');
      console.log('you might need to restart your application for changes to take effect.');
    } else {
      console.log('\n\u274c Error: Some users could not be verified after creation.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the script
fixModelsAndCreateUsers();
