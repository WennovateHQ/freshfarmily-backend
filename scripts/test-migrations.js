/**
 * FreshFarmily Migration Test Script
 * 
 * This script tests that all current migrations run successfully.
 * It uses the existing database instead of creating a test database.
 */

const path = require('path');
const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
require('dotenv').config();

// Use the existing database from .env
const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 5432;
const DB_DIALECT = process.env.DB_DIALECT || 'postgres';

console.log(`Connecting to database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}`);

// Create database connection
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: DB_DIALECT,
  logging: console.log
});

// Configure Umzug (migration handler)
const umzug = new Umzug({
  migrations: {
    glob: ['../src/migrations/*.js', { cwd: __dirname }],
    resolve: ({ name, path, context }) => {
      const migration = require(path);
      return {
        name,
        up: async () => migration.up(context.queryInterface, context.sequelize),
        down: async () => migration.down(context.queryInterface, context.sequelize)
      };
    }
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console
});

async function testMigrations() {
  try {
    console.log('Testing database connection...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Just get pending migrations without executing them
    console.log('\nListing pending migrations (without executing them):');
    const pendingMigrations = await umzug.pending();
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations found. All migrations have been applied.');
    } else {
      console.log(`Found ${pendingMigrations.length} pending migrations:`);
      pendingMigrations.forEach(migration => {
        console.log(`- ${migration.name}`);
      });
      
      console.log('\nTo run these migrations, use the --run flag');
    }
    
    // List executed migrations
    console.log('\nListing executed migrations:');
    const executedMigrations = await umzug.executed();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations have been executed yet.');
    } else {
      console.log(`Found ${executedMigrations.length} executed migrations:`);
      executedMigrations.forEach(migration => {
        console.log(`- ${migration.name}`);
      });
    }
    
    // Check if --run flag was provided
    if (process.argv.includes('--run')) {
      if (pendingMigrations.length > 0) {
        console.log('\nRunning pending migrations...');
        const migrations = await umzug.up();
        
        console.log(`\nSuccessfully ran ${migrations.length} migrations:`);
        migrations.forEach(migration => {
          console.log(`- ${migration.name}`);
        });
      } else if (process.argv.includes('--force-run')) {
        // If --force-run is specified and there are no pending migrations, try running reset migration
        console.log('\nNo pending migrations but --force-run specified. Trying to run reset migration...');
        
        // Manually run the reset migration
        const resetMigrationPath = path.join(__dirname, '../src/migrations/20250401-reset-migrations.js');
        const resetMigration = require(resetMigrationPath);
        
        await resetMigration.up(sequelize.getQueryInterface(), Sequelize);
        console.log('Successfully ran reset migration');
      }
    }
    
    // Check if --reset flag was provided (DANGER: will drop all tables)
    if (process.argv.includes('--reset')) {
      console.log('\nWARNING: Resetting database by reverting all migrations...');
      console.log('This will drop all tables in the database.');
      
      const downMigrations = await umzug.down({ to: 0 });
      
      console.log(`\nSuccessfully reverted ${downMigrations.length} migrations.`);
      
      console.log('\nRunning all migrations again...');
      const upMigrations = await umzug.up();
      
      console.log(`\nSuccessfully ran ${upMigrations.length} migrations.`);
    }
    
    console.log('\nMigration test completed successfully!');
  } catch (error) {
    console.error('Error during migration test:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testMigrations();
