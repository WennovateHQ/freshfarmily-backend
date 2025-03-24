/**
 * FreshFarmily API Server
 * 
 * Main entry point for the FreshFarmily Express.js backend application
 */

const http = require('http');
const { sequelize, testConnection } = require('./config/database');
const { initializeModels } = require('./models/index');
const logger = require('./utils/logger');
const app = require('./app');
require('dotenv').config();

// Initialize Express app
const PORT = process.env.PORT || 5000; // Force 5000 as default port
const NODE_ENV = process.env.NODE_ENV || 'production'; // Default to production for safety

// Create HTTP server
const server = http.createServer(app);

/**
 * Initialize database and models
 */
async function initializeDatabase() {
  try {
    // Test database connection
    await testConnection();
    logger.info('Database connection successful');
    
    // Initialize models
    initializeModels();
    
    // Sync database in development (never in production)
    if (NODE_ENV === 'development') {
      logger.info('Syncing database models...');
      await sequelize.sync({ alter: false }); // Avoid auto alter in development too
      logger.info('Database sync complete');
    }
    
    return true;
  } catch (error) {
    logger.error('Database initialization failed:', error);
    return false;
  }
}

/**
 * Start the server
 */
function startServer(port) {
  server.listen(port, () => {
    logger.info(`Server running in ${NODE_ENV} mode on port ${port}`);
    
    // Log startup info but not sensitive URLs in production
    if (NODE_ENV !== 'production') {
      logger.info(`API Documentation: http://localhost:${port}/api/docs`);
      logger.info(`Health check: http://localhost:${port}/health`);
    } else {
      logger.info('Server started successfully');
    }
  });
  
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.warn(`Port ${port} is already in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      logger.error('Server error:', error);
      process.exit(1);
    }
  });
}

// Initialize the application
async function initialize() {
  try {
    // Initialize database
    const dbInitialized = await initializeDatabase();
    if (!dbInitialized && NODE_ENV === 'production') {
      throw new Error('Database initialization failed in production mode');
    }
    
    // Start with the initial port
    startServer(PORT);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unexpected errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // In production, we may want to attempt a graceful shutdown
  if (NODE_ENV === 'production') {
    // Give the logger time to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  } else {
    // In development, we might prefer to crash immediately for visibility
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});

// Start the application
initialize();
