/**
 * Swagger Configuration
 * 
 * Configuration for Swagger API documentation
 */

const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'FreshFarmily API',
      version: '1.0.0',
      description: 'API documentation for the FreshFarmily backend services',
      contact: {
        name: 'FreshFarmily Team',
        url: 'https://freshfarmily.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:8000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        // User schemas
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'farmer', 'driver', 'consumer'] },
            status: { type: 'string', enum: ['pending', 'active', 'suspended', 'deleted'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Farm schemas
        Farm: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            farmerId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zipCode: { type: 'string' },
            phoneNumber: { type: 'string' },
            email: { type: 'string', format: 'email' },
            website: { type: 'string' },
            status: { type: 'string', enum: ['active', 'pending', 'suspended', 'closed'] },
            isVerified: { type: 'boolean' },
            acceptsPickup: { type: 'boolean' },
            acceptsDelivery: { type: 'boolean' },
            deliveryRange: { type: 'number' },
            pickupInstructions: { type: 'string' },
            certifications: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Product schemas
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            farmId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            subcategory: { type: 'string' },
            price: { type: 'number' },
            unit: { type: 'string' },
            quantityAvailable: { type: 'number' },
            isOrganic: { type: 'boolean' },
            isAvailable: { type: 'boolean' },
            status: { type: 'string', enum: ['active', 'out_of_stock', 'coming_soon', 'archived'] },
            imageUrl: { type: 'string' },
            harvestedDate: { type: 'string', format: 'date-time' },
            expectedAvailability: { type: 'string', format: 'date-time' },
            tags: { type: 'array', items: { type: 'string' } },
            isFeatured: { type: 'boolean' },
            discountPercent: { type: 'integer' },
            minOrderQuantity: { type: 'number' },
            maxOrderQuantity: { type: 'number' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Order schemas
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            orderNumber: { type: 'string' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
            paymentStatus: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
            cancellationReason: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Delivery schemas
        Delivery: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid' },
            driverId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['pending', 'assigned', 'in_progress', 'completed', 'cancelled'] },
            deliveryMethod: { type: 'string', enum: ['pickup', 'delivery'] },
            scheduledPickupTime: { type: 'string', format: 'date-time' },
            actualPickupTime: { type: 'string', format: 'date-time' },
            scheduledDeliveryTime: { type: 'string', format: 'date-time' },
            actualDeliveryTime: { type: 'string', format: 'date-time' },
            deliveryAddress: { type: 'string' },
            deliveryCity: { type: 'string' },
            deliveryState: { type: 'string' },
            deliveryZipCode: { type: 'string' },
            deliveryInstructions: { type: 'string' },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        
        // Auth schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password', minLength: 6 }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password', 'role'],
          properties: {
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', format: 'password', minLength: 6 },
            role: { type: 'string', enum: ['farmer', 'driver', 'consumer'] }
          }
        },
        TokenResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            userId: { type: 'string', format: 'uuid' },
            role: { type: 'string' },
            expiresIn: { type: 'integer' }
          }
        },
        
        // Error response
        ErrorResponse: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            stack: { type: 'string' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints'
      },
      {
        name: 'Users',
        description: 'User management endpoints'
      },
      {
        name: 'Farms',
        description: 'Farm management endpoints'
      },
      {
        name: 'Products',
        description: 'Product management endpoints'
      },
      {
        name: 'Orders',
        description: 'Order management endpoints'
      },
      {
        name: 'Deliveries',
        description: 'Delivery management endpoints'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
