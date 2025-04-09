/**
 * Database Health Check
 * 
 * This script performs diagnostics on the database to ensure tables are properly configured
 * and checks for common issues that could cause authentication and order fetching problems.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcrypt');

async function runDiagnostics() {
  try {
    logger.info('Starting database health check...');
    
    // 1. Check database connection
    await sequelize.authenticate();
    logger.info('✅ Database connection is working');
    
    // 2. List all tables
    const [tables] = await sequelize.query(`
      SELECT tablename FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);
    logger.info(`Found ${tables.length} tables: ${tables.map(t => t.tablename).join(', ')}`);
    
    // 3. Check specific tables exist
    const requiredTables = ['users', 'profiles', 'farms', 'products', 'orders', 'order_items'];
    for (const table of requiredTables) {
      const exists = tables.some(t => t.tablename === table);
      if (exists) {
        logger.info(`✅ Table '${table}' exists`);
      } else {
        logger.error(`❌ Required table '${table}' is missing!`);
      }
    }
    
    // 4. Check for user records
    const [users] = await sequelize.query('SELECT COUNT(*) as count FROM users');
    logger.info(`Found ${users[0].count} users in the database`);
    
    // 5. Inspect order status enum
    try {
      const [enumValues] = await sequelize.query(`
        SELECT e.enumlabel
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'enum_orders_status';
      `);
      
      if (enumValues.length > 0) {
        logger.info(`Order status enum values: ${enumValues.map(v => v.enumlabel).join(', ')}`);
        
        // Check for specific values
        const requiredStatuses = ['pending', 'confirmed', 'processing', 'delivered'];
        for (const status of requiredStatuses) {
          if (enumValues.some(v => v.enumlabel === status)) {
            logger.info(`✅ Order status '${status}' exists in enum`);
          } else {
            logger.error(`❌ Required order status '${status}' is missing from enum!`);
          }
        }
      } else {
        logger.error('❌ No enum values found for order status!');
      }
    } catch (error) {
      logger.error(`Error checking order status enum: ${error.message}`);
    }
    
    // 6. Check user password hashing
    try {
      const [sampleUser] = await sequelize.query(`
        SELECT id, password FROM users LIMIT 1;
      `);
      
      if (sampleUser && sampleUser.length > 0) {
        const isValidHash = sampleUser[0].password.startsWith('$2b$') || sampleUser[0].password.startsWith('$2a$');
        if (isValidHash) {
          logger.info('✅ User passwords appear to be properly hashed with bcrypt');
        } else {
          logger.error('❌ User passwords may not be properly hashed!');
        }
      } else {
        logger.warn('No users found to check password hashing');
      }
    } catch (error) {
      logger.error(`Error checking password hashing: ${error.message}`);
    }
    
    // 7. Create a test user if none exists (for development only)
    if (process.env.NODE_ENV === 'development' && parseInt(users[0].count) === 0) {
      try {
        const testPassword = await bcrypt.hash('password123', 10);
        await sequelize.query(`
          INSERT INTO users (id, email, password, "firstName", "lastName", role, status, "createdAt", "updatedAt")
          VALUES (
            '11111111-1111-1111-1111-111111111111',
            'test@freshfarmily.com',
            :password,
            'Test',
            'User',
            'farmer',
            'active',
            NOW(),
            NOW()
          )
        `, {
          replacements: { password: testPassword }
        });
        logger.info('✅ Created a test user with credentials: test@freshfarmily.com / password123');
      } catch (error) {
        logger.error(`Error creating test user: ${error.message}`);
      }
    }
    
    logger.info('Database health check completed');
  } catch (error) {
    logger.error(`Database health check failed: ${error.message}`);
  } finally {
    // Don't close the connection, let the app handle that
    logger.info('Diagnostics complete.');
  }
}

// Run diagnostics
runDiagnostics();
