/**
 * FreshFarmily Express Application
 * 
 * This file configures the Express application and middleware
 * Separating app.js from server.js makes testing easier
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const logger = require('./utils/logger');
const path = require('path'); // Import path module
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
const paymentRoutes = require('./routes/paymentRoutes');
const referralRoutes = require('./routes/referralRoutes');
const driverRoutes = require('./routes/driverRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const settingsRoutes = require('./routes/settingsRoutes'); // Import settings routes
const cartRoutes = require('./routes/cartRoutes'); // Import cart routes
const { limiter, authLimiter } = require('./middleware/rateLimiter'); // Import rate limiters

// Initialize Express app
const app = express();
const NODE_ENV = process.env.NODE_ENV || 'production'; // Default to production for safety

// Serve uploaded files statically
const uploadsDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));
logger.info(`Serving uploads from: ${uploadsDir}`);

// Middleware
app.use(helmet({ 
  crossOriginResourcePolicy: { policy: 'cross-origin' } 
})); 

// Configure CORS - more restricted in production
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests)
    if(!origin) return callback(null, true);
    
    const allowedOrigins = NODE_ENV === 'production'
      ? (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [process.env.FRONTEND_URL])
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://localhost:8080', 'http://127.0.0.1:8080']; // Allow common local development URLs
      
    // Check if the origin is allowed
    if(allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      // Log detailed information about rejected CORS requests
      logger.warn(`CORS rejected: Origin ${origin} not allowed`);
      return callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-Allow-Duplicate'],
  credentials: true, // Enable credentials for auth requests
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours - Cache preflight requests
};
app.use(cors(corsOptions));

// Log middleware initialization
logger.info(`CORS configured in ${NODE_ENV} mode`);

// Rate limiting - more aggressive in production
app.use(limiter);

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware - use minimal logging in production
if (NODE_ENV === 'production') {
  app.use(morgan('combined', {
    stream: { write: message => logger.info(message.trim()) },
    // Skip logging for health check endpoints
    skip: (req) => req.path === '/health' || req.path === '/api/health'
  }));
} else {
  app.use(morgan('dev'));
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// API Routes
const apiRouter = express.Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Documentation
apiRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Mount API routes
apiRouter.use('/auth', authLimiter, authRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/farms', farmRoutes);
apiRouter.use('/products', productRoutes);
apiRouter.use('/orders', orderRoutes);
apiRouter.use('/deliveries', deliveryRoutes);
apiRouter.use('/analytics', analyticsRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/referrals', referralRoutes);
apiRouter.use('/drivers', driverRoutes);
apiRouter.use('/wishlist', wishlistRoutes);
apiRouter.use('/upload', uploadRoutes); // Mount upload routes
apiRouter.use('/farmers', farmerRoutes); // Mount farmer routes
apiRouter.use('/settings', settingsRoutes); // Mount settings routes
apiRouter.use('/cart', cartRoutes); // Mount cart routes

// Mount all API routes under /api
app.use('/api', apiRouter);

// Main app health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Generic error handling middleware
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Don't expose error details in production
  const errorResponse = NODE_ENV === 'production'
    ? { error: 'Internal Server Error' }
    : { error: err.message, stack: NODE_ENV === 'development' ? err.stack : undefined };
  
  logger.error(`Error handling request ${req.method} ${req.path}:`, err);
  res.status(statusCode).json(errorResponse);
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

module.exports = app;
