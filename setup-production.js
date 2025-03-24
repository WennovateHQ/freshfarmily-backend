/**
 * FreshFarmily Production Setup Script
 * 
 * This script prepares the application for production by:
 * 1. Installing required dependencies
 * 2. Running database migrations
 * 3. Verifying API keys and environment variables
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ANSI color codes for better output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

console.log(`${colors.bright}${colors.blue}====================================${colors.reset}`);
console.log(`${colors.bright}${colors.blue}FreshFarmily Production Setup Script${colors.reset}`);
console.log(`${colors.bright}${colors.blue}====================================${colors.reset}\n`);

// Function to run shell commands
function runCommand(command, message) {
  console.log(`${colors.yellow}${message}...${colors.reset}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`${colors.green}✓ Success!${colors.reset}\n`);
    return true;
  } catch (error) {
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}\n`);
    return false;
  }
}

// Function to check environment variables
function checkEnvironmentVariables() {
  console.log(`${colors.yellow}Checking required environment variables...${colors.reset}`);
  
  const requiredVariables = [
    'PORT',
    'NODE_ENV',
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'GOOGLE_MAPS_API_KEY'
  ];
  
  const missingVariables = [];
  
  requiredVariables.forEach(variable => {
    if (!process.env[variable]) {
      missingVariables.push(variable);
    }
  });
  
  if (missingVariables.length > 0) {
    console.log(`${colors.red}✗ Missing environment variables: ${missingVariables.join(', ')}${colors.reset}`);
    console.log(`${colors.yellow}Please add these variables to your .env file${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✓ All required environment variables are present!${colors.reset}\n`);
  return true;
}

// Function to verify API keys
async function verifyApiKeys() {
  console.log(`${colors.yellow}Verifying API keys...${colors.reset}`);
  
  // Very basic checks to ensure keys look valid
  let allValid = true;
  
  // Check Stripe key format (begins with sk_)
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    console.log(`${colors.red}✗ Invalid Stripe secret key format. Should start with "sk_"${colors.reset}`);
    allValid = false;
  }
  
  // Check Google Maps API key (at least 20 chars)
  if (!process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY.length < 20) {
    console.log(`${colors.red}✗ Google Maps API key appears to be invalid or too short${colors.reset}`);
    allValid = false;
  }
  
  if (!allValid) {
    console.log(`${colors.yellow}Please check your API keys in the .env file${colors.reset}`);
    return false;
  }
  
  console.log(`${colors.green}✓ API keys appear to be valid!${colors.reset}\n`);
  return true;
}

// Main function to run setup
async function runSetup() {
  try {
    // Install dependencies
    if (!runCommand('npm install', 'Installing dependencies')) {
      throw new Error('Failed to install dependencies');
    }
    
    // Check environment variables
    if (!checkEnvironmentVariables()) {
      const createEnvFile = await askQuestion('Would you like to create a sample .env file? (y/n): ');
      if (createEnvFile.toLowerCase() === 'y') {
        fs.copyFileSync(
          path.join(__dirname, '.env.example'), 
          path.join(__dirname, '.env')
        );
        console.log(`${colors.green}✓ Created .env file from example template${colors.reset}`);
        console.log(`${colors.yellow}Please edit the .env file with your actual values and run this script again${colors.reset}\n`);
        process.exit(0);
      }
      throw new Error('Missing environment variables');
    }
    
    // Verify API keys
    if (!await verifyApiKeys()) {
      throw new Error('Invalid API keys');
    }
    
    // Run database migrations
    const migrationsDir = path.join(__dirname, 'src', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.js'))
        .sort(); // Sort to ensure consistent order
      
      if (files.length > 0) {
        console.log(`${colors.yellow}Found ${files.length} migrations to run${colors.reset}`);
        
        // First, test database connection
        if (!runCommand('node -e "require(\'./src/config/database\').testConnection()"', 'Testing database connection')) {
          throw new Error('Failed to connect to database');
        }
        
        // Run the combined migration file first if it exists
        const combinedMigrationFile = files.find(f => f.includes('complete_schema_setup'));
        if (combinedMigrationFile) {
          console.log(`${colors.cyan}Running combined schema migration: ${combinedMigrationFile}${colors.reset}`);
          try {
            const { Sequelize } = require('sequelize');
            const migration = require(path.join(migrationsDir, combinedMigrationFile));
            
            // Create a Sequelize instance for running migrations
            const sequelize = new Sequelize(
              process.env.DB_NAME,
              process.env.DB_USER,
              process.env.DB_PASSWORD,
              {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                dialect: process.env.DB_DIALECT || 'postgres',
                logging: false,
                dialectOptions: {
                  ssl: process.env.DB_SSL === 'true' ? {
                    require: true,
                    rejectUnauthorized: false
                  } : false
                }
              }
            );
            
            await migration.up(sequelize.getQueryInterface(), Sequelize);
            console.log(`${colors.green}✓ Combined schema migration completed successfully${colors.reset}\n`);
            
            // Skip running other migrations since we've run the combined one
            console.log(`${colors.yellow}Skipping individual migrations as combined schema was applied${colors.reset}\n`);
          } catch (err) {
            console.error(`${colors.red}✗ Error during combined migration: ${err.message}${colors.reset}`);
            console.error(`${colors.red}Stack trace: ${err.stack}${colors.reset}`);
            
            if (err.parent) {
              console.error(`${colors.red}Database error: ${err.parent.message}${colors.reset}`);
            }
            
            throw new Error('Failed to run combined database migration');
          }
        } else {
          // Run individual migrations if no combined file exists
          for (const file of files) {
            const migration = require(path.join(migrationsDir, file));
            const { Sequelize } = require('sequelize');
            
            // Create a Sequelize instance for running migrations
            const sequelize = new Sequelize(
              process.env.DB_NAME,
              process.env.DB_USER,
              process.env.DB_PASSWORD,
              {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                dialect: process.env.DB_DIALECT || 'postgres',
                logging: false,
                dialectOptions: {
                  ssl: process.env.DB_SSL === 'true' ? {
                    require: true,
                    rejectUnauthorized: false
                  } : false
                }
              }
            );
            
            try {
              console.log(`${colors.yellow}Running migration: ${file}${colors.reset}`);
              await migration.up(sequelize.getQueryInterface(), Sequelize);
              console.log(`${colors.green}✓ Migration successful: ${file}${colors.reset}\n`);
            } catch (err) {
              if (err.message.includes('already exists')) {
                console.log(`${colors.yellow}Table already exists, skipping...${colors.reset}\n`);
              } else {
                console.error(`${colors.red}✗ Error during migration ${file}: ${err.message}${colors.reset}`);
                if (err.parent) {
                  console.error(`${colors.red}Database error: ${err.parent.message}${colors.reset}`);
                }
                throw err;
              }
            }
          }
        }
      } else {
        console.log(`${colors.yellow}No migrations found in ${migrationsDir}${colors.reset}\n`);
      }
    } else {
      console.log(`${colors.yellow}Migrations directory not found${colors.reset}\n`);
    }
    
    // Final check of database connection
    if (!runCommand('node -e "require(\'./src/config/database\').testConnection()"', 'Verifying database connection')) {
      throw new Error('Failed to connect to database');
    }
    
    console.log(`${colors.bright}${colors.green}✓ Setup completed successfully!${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}You can now start the application in production mode with:${colors.reset}`);
    console.log(`${colors.cyan}NODE_ENV=production npm start${colors.reset}\n`);
    
  } catch (error) {
    console.error(`${colors.red}Setup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Helper function for asking questions
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Run the setup
runSetup();
