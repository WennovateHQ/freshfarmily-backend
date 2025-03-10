/**
 * FreshFarmily API Server
 * 
 * Main entry point for the FreshFarmily Express.js backend application
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const { sequelize, testConnection } = require('./config/database');
const { initializeModels } = require('./models/index');
const logger = require('./utils/logger');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const farmRoutes = require('./routes/farmRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const deliveryRoutes = require('./routes/deliveryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Initialize Express app
const app = express();
const PORT = parseInt(process.env.PORT) || 8000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // CORS for all origins (configure for production)
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Request logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) }
  }));
}

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again after 15 minutes',
  // Skip rate limiting in test mode
  skip: (req) => {
    // Check if testing mode is enabled
    const isTestingMode = process.env.NODE_ENV === 'test' || process.env.TESTING === 'true';
    if (isTestingMode) {
      logger.debug('Bypassing rate limit in testing mode');
      return true; // Skip rate limiting
    }
    return false; // Apply rate limiting
  }
});

// Apply rate limiting to all routes
app.use(apiLimiter);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, { error: err.stack });
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    ...(NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// API Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'FreshFarmily API Documentation'
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/farms', farmRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Add a simple debug endpoint that doesn't require database access
app.get('/api/debug', (req, res) => {
  const testingMode = process.env.NODE_ENV === 'test' || process.env.TESTING === 'true';
  logger.debug(`Debug endpoint accessed, testing mode: ${testingMode}`);
  
  return res.status(200).json({
    status: 'success',
    message: 'Debug endpoint working',
    testingMode: testingMode,
    env: {
      NODE_ENV: process.env.NODE_ENV,
      TESTING: process.env.TESTING
    },
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the FreshFarmily API',
    documentation: '/api/docs',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: '1.0.0',
    environment: NODE_ENV
  });
});

// Database initialization and server start
(async () => {
  try {
    // Test database connection
    const connected = await testConnection();
    
    if (!connected) {
      logger.error('Unable to connect to the database. Server will not start.');
      process.exit(1);
    }
    
    // Initialize model associations
    initializeModels();
    
    // Sync models with database
    // In production, you should use migrations instead of sync
    if (NODE_ENV === 'development') {
      try {
        logger.info('Syncing database models...');
        await sequelize.sync({ force: true }); // Use force instead of alter for testing
        logger.info('Database models synchronized');
      } catch (error) {
        logger.error(`Database synchronization error: ${error.message}`);
        logger.debug(error.stack);
        // Continue anyway for testing purposes
      }
    }
    
    // Start the server
    const startServer = (port) => {
      const server = app.listen(port, () => {
        logger.info(`Server running in ${NODE_ENV} mode on port ${port}`);
        logger.info(`API available at http://localhost:${port}`);
        logger.info(`API Documentation available at http://localhost:${port}/api/docs`);
      });
      
      // Add error handler for the server
      server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is already in use, trying ${parseInt(port) + 1}...`);
          server.close();
          // Try the next port
          startServer(parseInt(port) + 1);
        } else {
          logger.error('Server error:', e);
        }
      });
    };
    
    // Start with the initial port
    startServer(PORT);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Promise Rejection:', err);
  // In production, you might want to exit and let the process manager restart
  // process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Exit the process in case of an uncaught exception
  process.exit(1);
});
