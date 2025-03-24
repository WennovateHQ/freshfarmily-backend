/**
 * Direct Fix for User Authentication
 * 
 * This script uses a direct approach to create properly authenticated users
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
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

// Password for all test accounts
const TEST_PASSWORD = 'password123';

async function directFixUsers() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully!\n');
    
    // Generate hash
    console.log(`Creating password hash for "${TEST_PASSWORD}"...`);
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    console.log(`Generated hash: ${hashedPassword}`);
    
    // Check if the hash is valid
    const isValid = await bcrypt.compare(TEST_PASSWORD, hashedPassword);
    console.log(`Password verification test: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (!isValid) {
      throw new Error('Password hash verification failed');
    }
    
    // Delete existing test users
    console.log('\nDeleting existing test users...');
    await sequelize.query(
      `DELETE FROM "Profiles" WHERE "userId" IN (SELECT "id" FROM "Users" WHERE "email" IN ('admin@freshfarmily.com', 'consumer@freshfarmily.com', 'test@example.com'))`
    );
    
    await sequelize.query(
      `DELETE FROM "Users" WHERE "email" IN ('admin@freshfarmily.com', 'consumer@freshfarmily.com', 'test@example.com')`
    );
    
    // Create admin user
    console.log('\nCreating admin user...');
    const [adminResult] = await sequelize.query(
      `INSERT INTO "Users" ("id", "email", "password", "firstName", "lastName", "role", "status", "emailVerified", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), 'admin@freshfarmily.com', :password, 'Admin', 'User', 'admin', 'active', true, NOW(), NOW()) RETURNING "id"`,
      {
        replacements: { password: hashedPassword }
      }
    );
    
    const adminId = adminResult[0].id;
    console.log(`Created admin user with ID: ${adminId}`);
    
    // Create admin profile
    await sequelize.query(
      `INSERT INTO "Profiles" ("id", "userId", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), :userId, NOW(), NOW())`,
      {
        replacements: { userId: adminId }
      }
    );
    
    // Create consumer user
    console.log('\nCreating consumer user...');
    const [consumerResult] = await sequelize.query(
      `INSERT INTO "Users" ("id", "email", "password", "firstName", "lastName", "role", "status", "emailVerified", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), 'consumer@freshfarmily.com', :password, 'Consumer', 'User', 'consumer', 'active', true, NOW(), NOW()) RETURNING "id"`,
      {
        replacements: { password: hashedPassword }
      }
    );
    
    const consumerId = consumerResult[0].id;
    console.log(`Created consumer user with ID: ${consumerId}`);
    
    // Create consumer profile
    await sequelize.query(
      `INSERT INTO "Profiles" ("id", "userId", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), :userId, NOW(), NOW())`,
      {
        replacements: { userId: consumerId }
      }
    );
    
    // Create test user account
    console.log('\nCreating test user...');
    const [testResult] = await sequelize.query(
      `INSERT INTO "Users" ("id", "email", "password", "firstName", "lastName", "role", "status", "emailVerified", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), 'test@example.com', :password, 'Test', 'User', 'consumer', 'active', true, NOW(), NOW()) RETURNING "id"`,
      {
        replacements: { password: hashedPassword }
      }
    );
    
    const testId = testResult[0].id;
    console.log(`Created test user with ID: ${testId}`);
    
    // Create test profile
    await sequelize.query(
      `INSERT INTO "Profiles" ("id", "userId", "createdAt", "updatedAt") 
       VALUES (uuid_generate_v4(), :userId, NOW(), NOW())`,
      {
        replacements: { userId: testId }
      }
    );
    
    // Verify users exist
    console.log('\nVerifying users in database:');
    const [users] = await sequelize.query(
      `SELECT "id", "email", "role" FROM "Users" WHERE "email" IN ('admin@freshfarmily.com', 'consumer@freshfarmily.com', 'test@example.com')`
    );
    
    if (users.length === 3) {
      console.log('✅ All test users created successfully!');
      users.forEach(user => {
        console.log(`- ${user.email} (${user.role}) [ID: ${user.id}]`);
      });
      
      // Test password verification directly
      console.log('\nTesting password verification:');
      for (const user of users) {
        const [userWithPass] = await sequelize.query(
          `SELECT "password" FROM "Users" WHERE "id" = :id`,
          {
            replacements: { id: user.id }
          }
        );
        
        const passwordVerifies = await bcrypt.compare(TEST_PASSWORD, userWithPass[0].password);
        console.log(`- ${user.email}: ${passwordVerifies ? '✅ PASSED' : '❌ FAILED'}`);
      }
      
      console.log('\nLogin credentials (all accounts):');
      console.log('Password: password123');
    } else {
      console.log(`❌ Error: Expected 3 users, but found ${users.length}`);
    }
    
    console.log('\nPlease restart your application server for changes to take effect.');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the script
directFixUsers();
