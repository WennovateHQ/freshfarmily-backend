/**
 * Simple Authentication Fix
 * 
 * Create test users using the application's models
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { User, Profile } = require('../src/models/user');
const { sequelize } = require('../src/config/database');

async function createTestUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // First, check if there are any users in the database
    const userCount = await User.count();
    console.log(`Found ${userCount} users in the database.`);
    
    // Try to find our test users
    const adminUser = await User.findOne({ where: { email: 'admin@freshfarmily.com' } });
    const consumerUser = await User.findOne({ where: { email: 'consumer@freshfarmily.com' } });
    
    // If we have existing users, update their passwords
    if (adminUser || consumerUser) {
      console.log('Found existing test users. Updating passwords...');
      
      // Create password with direct hashing (not using hooks)
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Test the hash
      const isValid = await bcrypt.compare(password, hashedPassword);
      console.log(`Password verification test: ${isValid ? '✓ PASSED' : '✗ FAILED'}`);
      
      if (!isValid) {
        throw new Error('Password hash verification failed');
      }
      
      // Update admin password if exists
      if (adminUser) {
        await User.update(
          { password: hashedPassword },
          { where: { id: adminUser.id }, individualHooks: false }
        );
        console.log(`Updated admin user password: ${adminUser.email}`);
      }
      
      // Update consumer password if exists
      if (consumerUser) {
        await User.update(
          { password: hashedPassword },
          { where: { id: consumerUser.id }, individualHooks: false }
        );
        console.log(`Updated consumer user password: ${consumerUser.email}`);
      }
    } else {
      // Create test users from scratch
      console.log('Creating new test users...');
      
      // Create password with direct hashing (not using hooks)
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create admin user
      const admin = await User.create({
        email: 'admin@freshfarmily.com',
        password: hashedPassword, // Pre-hashed password
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        status: 'active',
        emailVerified: true
      }, { hooks: false }); // Skip password hashing hook
      
      // Create admin profile
      await Profile.create({
        userId: admin.id
      });
      
      console.log(`Created admin user: ${admin.email}`);
      
      // Create consumer user
      const consumer = await User.create({
        email: 'consumer@freshfarmily.com',
        password: hashedPassword, // Pre-hashed password
        firstName: 'Consumer',
        lastName: 'User',
        role: 'consumer',
        status: 'active',
        emailVerified: true
      }, { hooks: false }); // Skip password hashing hook
      
      // Create consumer profile
      await Profile.create({
        userId: consumer.id
      });
      
      console.log(`Created consumer user: ${consumer.email}`);
    }
    
    // Verify user authentication
    console.log('\nVerifying test user authentication:');
    
    // Get the updated users
    const admin = await User.findOne({ where: { email: 'admin@freshfarmily.com' } });
    const consumer = await User.findOne({ where: { email: 'consumer@freshfarmily.com' } });
    
    if (admin) {
      const adminAuth = await bcrypt.compare('password123', admin.password);
      console.log(`Admin authentication: ${adminAuth ? '✓ PASSED' : '✗ FAILED'}`);
    } else {
      console.log('Admin user not found!');
    }
    
    if (consumer) {
      const consumerAuth = await bcrypt.compare('password123', consumer.password);
      console.log(`Consumer authentication: ${consumerAuth ? '✓ PASSED' : '✗ FAILED'}`);
    } else {
      console.log('Consumer user not found!');
    }
    
    if ((admin && await bcrypt.compare('password123', admin.password)) || 
        (consumer && await bcrypt.compare('password123', consumer.password))) {
      console.log('\n✅ Authentication test users ready!');
      console.log('\nLogin credentials:');
      console.log('- Admin: admin@freshfarmily.com / password123');
      console.log('- Consumer: consumer@freshfarmily.com / password123');
      
      console.log('\nPlease restart your application server to apply all changes.');
    } else {
      console.log('\n❌ Failed to create or update authentication users.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the script
createTestUsers();
