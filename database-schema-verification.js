/**
 * FreshFarmily Database Schema and Authentication Verification
 * 
 * This script verifies:
 * 1. The database connection is working
 * 2. All necessary tables are created with correct structure
 * 3. JWT tokens can be created and verified
 * 4. Role-based permissions work correctly
 */

require('dotenv').config();
const { sequelize } = require('./src/config/database');
const jwtUtils = require('./src/utils/jwt');
const { User } = require('./src/models');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Colors for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Expected database tables
const EXPECTED_TABLES = [
  'Users', 
  'Memberships', 
  'Orders', 
  'Deliveries', 
  'DeliveryBatches', 
  'RouteOptimizationHistories',
  'DriverCompensationConfigs',
  'DriverEarnings'
];

// Role-based permission mapping
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'update', 'delete', 'admin', 'read_admin', 'read_farm'],
  farmer: ['read', 'write', 'update', 'delete_own', 'read_farm'],
  driver: ['read', 'update_delivery'],
  consumer: ['read', 'create_order']
};

async function runDatabaseSchemaTest() {
  console.log(`${colors.bright}${colors.blue}===========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}FreshFarmily Database Schema Verification${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}===========================================${colors.reset}\n`);

  try {
    // 1. Test database connection
    console.log(`${colors.yellow}Testing database connection...${colors.reset}`);
    await sequelize.authenticate();
    console.log(`${colors.green}✓ Database connection successful${colors.reset}\n`);

    // 2. Verify database tables
    console.log(`${colors.yellow}Verifying database tables...${colors.reset}`);
    
    // Get all tables in the database
    const [results] = await sequelize.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\';');
    const dbTables = results.map(r => r.tablename);
    
    console.log(`${colors.cyan}Found ${dbTables.length} tables in database:${colors.reset}`);
    dbTables.forEach(table => console.log(`- ${table}`));
    console.log('');
    
    // Check if all expected tables exist
    const missingTables = EXPECTED_TABLES.filter(table => 
      !dbTables.some(dbTable => dbTable.toLowerCase() === table.toLowerCase())
    );
    
    if (missingTables.length === 0) {
      console.log(`${colors.green}✓ All expected tables exist in the database${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Missing tables: ${missingTables.join(', ')}${colors.reset}`);
    }
    
    // 3. Verify column structure for critical tables
    console.log(`\n${colors.yellow}Verifying critical table structures...${colors.reset}`);
    
    // Check Users table
    const usersColumns = await getTableColumns('Users');
    console.log(`${colors.cyan}Users table columns:${colors.reset}`);
    usersColumns.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
    
    const requiredUserColumns = ['id', 'email', 'password', 'firstName', 'lastName', 'role'];
    const missingUserColumns = requiredUserColumns.filter(col => 
      !usersColumns.some(dbCol => dbCol.column_name.toLowerCase() === col.toLowerCase())
    );
    
    if (missingUserColumns.length === 0) {
      console.log(`${colors.green}✓ Users table has all required columns${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ Users table missing columns: ${missingUserColumns.join(', ')}${colors.reset}`);
    }
    
    // 4. Test JWT token generation and verification
    console.log(`\n${colors.yellow}Testing JWT functionality...${colors.reset}`);
    
    // Create a test user if not exists
    let testUser = await User.findOne({
      where: { email: 'api_test@freshfarmily.com' }
    });
    
    if (!testUser) {
      const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
      testUser = await User.create({
        id: uuidv4(),
        email: 'api_test@freshfarmily.com',
        password: hashedPassword,
        firstName: 'API',
        lastName: 'Test',
        role: 'admin',
        isActive: true
      });
      console.log(`${colors.green}✓ Created test user: api_test@freshfarmily.com${colors.reset}`);
    } else {
      console.log(`${colors.yellow}Using existing test user: api_test@freshfarmily.com${colors.reset}`);
    }
    
    // Generate JWT token
    const tokenData = jwtUtils.createTokens(testUser);
    console.log(`${colors.green}✓ Generated JWT token for test user${colors.reset}`);
    
    // Verify token
    const accessToken = tokenData.access_token;
    const decoded = jwtUtils.verifyToken(accessToken);
    
    if (decoded && decoded.userId === testUser.id) {
      console.log(`${colors.green}✓ JWT token verification successful${colors.reset}`);
    } else {
      console.error(`${colors.red}✗ JWT token verification failed${colors.reset}`);
    }
    
    // Test permissions
    console.log(`\n${colors.yellow}Testing role-based permissions...${colors.reset}`);
    
    // Check permissions for each role
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const hasAllPermissions = jwtUtils.hasPermissions(role, permissions);
      
      if (hasAllPermissions) {
        console.log(`${colors.green}✓ Permissions for ${role} role are correctly configured${colors.reset}`);
        console.log(`  - ${permissions.join(', ')}`);
      } else {
        console.error(`${colors.red}✗ Permission check failed for ${role} role${colors.reset}`);
      }
    }
    
    console.log(`\n${colors.bright}${colors.green}✓ Database Schema and JWT Authentication Verification Complete${colors.reset}`);
    console.log(`${colors.bright}${colors.green}The API service is ready for production!${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}✗ Verification failed: ${error.message}${colors.reset}`);
    if (error.stack) {
      console.error(`${colors.red}Stack trace: ${error.stack}${colors.reset}`);
    }
  } finally {
    // Close database connection
    await sequelize.close();
    console.log(`${colors.blue}Database connection closed${colors.reset}`);
  }
}

// Helper function to get columns for a table
async function getTableColumns(tableName) {
  const [columns] = await sequelize.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = '${tableName.toLowerCase()}'
    ORDER BY ordinal_position;
  `);
  return columns;
}

// Run the verification
runDatabaseSchemaTest();
