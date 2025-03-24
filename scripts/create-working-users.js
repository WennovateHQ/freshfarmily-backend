/**
 * Create Working Test Users
 * 
 * This script creates test users that are guaranteed to work with the
 * existing database schema and authentication system.
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { Sequelize } = require('sequelize');

// Create direct database connection
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_NAME = process.env.DB_NAME || 'freshfarmily';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: false
});

// Role permissions based on memory
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'update', 'delete', 'admin'],
  farmer: ['read', 'write', 'update', 'delete_own'],
  driver: ['read', 'update_delivery'],
  consumer: ['read', 'create_order']
};

async function createWorkingUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // First, inspect the Profile table structure to determine what columns exist
    console.log('Inspecting Profile table structure...');
    const [profileColumns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'Profiles' AND table_schema = 'public'`
    );
    
    const profileColumnNames = profileColumns.map(col => col.column_name);
    console.log('Profile columns:', profileColumnNames.join(', '));
    
    // Check if the User table has firstName and lastName
    const [userColumns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'Users' AND table_schema = 'public'`
    );
    
    const userColumnNames = userColumns.map(col => col.column_name);
    console.log('User columns:', userColumnNames.join(', '));
    
    // Generate a fixed password hash for all test users
    const password = 'password123';
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(`\nGenerated consistent password hash for "${password}"`);
    
    // Verify hash works
    const isValid = await bcrypt.compare(password, hashedPassword);
    console.log(`Password verification: ${isValid ? '✓ VALID' : '✗ INVALID'}`);
    
    if (!isValid) {
      throw new Error('Password hash verification failed');
    }
    
    // Create test users with consistent IDs that we can use in the frontend
    const testUsers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        email: 'admin@freshfarmily.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        permissions: JSON.stringify(ROLE_PERMISSIONS.admin)
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        email: 'consumer@freshfarmily.com',
        firstName: 'Consumer',
        lastName: 'User',
        role: 'consumer',
        permissions: JSON.stringify(ROLE_PERMISSIONS.consumer)
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        email: 'farmer@freshfarmily.com',
        firstName: 'Farmer',
        lastName: 'User',
        role: 'farmer',
        permissions: JSON.stringify(ROLE_PERMISSIONS.farmer)
      },
      {
        id: '44444444-4444-4444-4444-444444444444',
        email: 'driver@freshfarmily.com',
        firstName: 'Driver',
        lastName: 'User',
        role: 'driver',
        permissions: JSON.stringify(ROLE_PERMISSIONS.driver)
      },
      {
        id: '55555555-5555-5555-5555-555555555555',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'consumer',
        permissions: JSON.stringify(ROLE_PERMISSIONS.consumer)
      }
    ];
    
    // First, clear out any existing test users to avoid conflicts
    console.log('\nRemoving existing test users...');
    for (const user of testUsers) {
      // Delete any associated profiles
      await sequelize.query(
        `DELETE FROM "Profiles" WHERE "userId" IN (SELECT "id" FROM "Users" WHERE "email" = :email)`,
        { replacements: { email: user.email } }
      );
      
      // Delete the user
      await sequelize.query(
        `DELETE FROM "Users" WHERE "email" = :email`,
        { replacements: { email: user.email } }
      );
    }
    
    // Now create fresh users with known IDs
    console.log('\nCreating fresh test users...');
    for (const user of testUsers) {
      // Insert the user with known ID
      if (userColumnNames.includes('firstname') && userColumnNames.includes('lastname')) {
        await sequelize.query(
          `INSERT INTO "Users" ("id", "email", "password", "firstName", "lastName", "role", "permissions", "status", "emailVerified", "createdAt", "updatedAt") 
           VALUES (:id, :email, :password, :firstName, :lastName, :role, :permissions, 'active', true, NOW(), NOW())`,
          {
            replacements: {
              id: user.id,
              email: user.email,
              password: hashedPassword,
              firstName: user.firstName,
              lastName: user.lastName,
              role: user.role,
              permissions: user.permissions
            }
          }
        );
      } else {
        // No firstName/lastName in Users table
        await sequelize.query(
          `INSERT INTO "Users" ("id", "email", "password", "role", "permissions", "status", "emailVerified", "createdAt", "updatedAt") 
           VALUES (:id, :email, :password, :role, :permissions, 'active', true, NOW(), NOW())`,
          {
            replacements: {
              id: user.id,
              email: user.email,
              password: hashedPassword,
              role: user.role,
              permissions: user.permissions
            }
          }
        );
      }
      
      // Create a basic profile for the user based on existing columns
      const profileId = uuidv4();
      if (profileColumnNames.includes('firstname') && profileColumnNames.includes('lastname')) {
        await sequelize.query(
          `INSERT INTO "Profiles" ("id", "userId", "firstName", "lastName", "createdAt", "updatedAt") 
           VALUES (:profileId, :userId, :firstName, :lastName, NOW(), NOW())`,
          {
            replacements: {
              profileId: profileId,
              userId: user.id,
              firstName: user.firstName,
              lastName: user.lastName
            }
          }
        );
      } else {
        // Just create a basic profile without firstName/lastName
        await sequelize.query(
          `INSERT INTO "Profiles" ("id", "userId", "createdAt", "updatedAt") 
           VALUES (:profileId, :userId, NOW(), NOW())`,
          {
            replacements: {
              profileId: profileId,
              userId: user.id
            }
          }
        );
      }
      
      console.log(`Created ${user.role} user: ${user.email} (ID: ${user.id})`);
    }
    
    // Enable test mode for the application
    console.log('\nSetting TESTING environment variable...');
    
    // Check for existing .env file
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(process.cwd(), '.env');
    
    if (fs.existsSync(envPath)) {
      console.log('Found existing .env file, updating with TESTING=true...');
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check if TESTING variable already exists
      if (envContent.includes('TESTING=')) {
        // Replace existing TESTING variable
        envContent = envContent.replace(/TESTING=.*/g, 'TESTING=true');
      } else {
        // Add TESTING variable at the end
        envContent += '\n# Testing mode\nTESTING=true\n';
      }
      
      fs.writeFileSync(envPath, envContent);
    } else {
      console.log('No .env file found, creating minimal .env file...');
      const minimalEnvContent = `# Database Configuration\nDB_HOST=${DB_HOST}\nDB_PORT=${DB_PORT}\nDB_NAME=${DB_NAME}\nDB_USER=${DB_USER}\nDB_PASSWORD=${DB_PASSWORD}\n\n# JWT Configuration\nJWT_SECRET=dev_jwt_secret_key\nJWT_REFRESH_SECRET=dev_jwt_refresh_secret_key\n\n# Testing mode\nTESTING=true\n`;
      fs.writeFileSync(envPath, minimalEnvContent);
    }
    
    console.log('\n✅ Test users created successfully!');
    console.log('\nLogin credentials for all users:');
    console.log('Password: password123');
    console.log('\nTest user emails:');
    testUsers.forEach(user => {
      console.log(`- ${user.email} (${user.role})`);
    });
    
    console.log('\nIMPORTANT: Please restart your server to apply these changes!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the script
createWorkingUsers();
