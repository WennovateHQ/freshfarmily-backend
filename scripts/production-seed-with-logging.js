/**
 * Production Seed Script for FreshFarmily (with file logging)
 * 
 * Creates essential admin user for production deployment
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/database');

// Initialize logging
const logFile = path.join(__dirname, 'production-seed-log.txt');
fs.writeFileSync(logFile, `FreshFarmily Production Seed Log - ${new Date().toISOString()}\n\n`, 'utf8');

function log(message) {
  console.log(message);
  fs.appendFileSync(logFile, message + '\n', 'utf8');
}

// Import models directly from the application
const db = require('../src/models/index');
const { User, Profile } = db;

// Configuration
const SALT_ROUNDS = 10;

// Hash password utility
async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

// Create admin user
async function createAdminUser() {
  log('Creating admin user...');
  
  try {
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { email: 'admin@freshfarmily.com' }
    });
    
    if (existingAdmin) {
      log('Admin user already exists, skipping creation');
      return;
    }
    
    // Create admin user with secure password from environment variable
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!'; // Default should be changed in production
    const hashedPassword = await hashPassword(adminPassword);
    
    const admin = await User.create({
      email: 'admin@freshfarmily.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active',
      emailVerified: true,
      firstName: 'Admin',
      lastName: 'User'
    });
    
    // Create admin profile
    await Profile.create({
      userId: admin.id,
      firstName: admin.firstName,
      lastName: admin.lastName,
      phoneNumber: process.env.ADMIN_PHONE || '(555) 123-4567',
      profileImage: null
    });
    
    log(`Created admin user: ${admin.email}`);
  } catch (error) {
    log(`Error creating admin user: ${error.message}`);
    throw error;
  }
}

// Main function to run the seed
async function seedProductionData() {
  try {
    log('Starting production database seeding...');
    
    // Create initial admin user
    await createAdminUser();
    
    log('Production seed completed successfully');
  } catch (error) {
    log(`Production seed error: ${error.message}`);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the seed script
seedProductionData();
