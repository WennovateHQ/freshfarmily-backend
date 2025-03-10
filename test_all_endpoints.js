/**
 * Comprehensive API Endpoint Tests for FreshFarmily Backend
 * 
 * This script tests all key endpoints of the FreshFarmily backend
 * using PostgreSQL and validates role-based permissions.
 */

require('dotenv').config();
const axios = require('axios');
const assert = require('assert');
const { sequelize } = require('./src/config/database');
const logger = require('./src/utils/logger');

// Base URL for API requests
const API_URL = `http://localhost:${process.env.PORT || 8000}`;

// Store tokens for authenticated requests
const tokens = {
  admin: null,
  farmer: null,
  driver: null,
  consumer: null
};

// User credentials for testing
const testUsers = {
  admin: {
    email: 'admin@freshfarmily.com',
    password: 'admin123'
  },
  farmer: {
    email: 'farmer@freshfarmily.com',
    password: 'farmer123'
  },
  driver: {
    email: 'driver@freshfarmily.com',
    password: 'driver123'
  },
  consumer: {
    email: 'consumer@freshfarmily.com',
    password: 'consumer123'
  }
};

// Store IDs for created resources
const testData = {
  farmId: null,
  userId: null,
  productId: null,
  orderId: null
};

/**
 * Helper function to make authenticated API requests
 */
async function apiRequest(method, endpoint, data = null, role = 'admin') {
  try {
    const token = tokens[role];
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers,
      data: method !== 'get' ? data : undefined,
      params: method === 'get' ? data : undefined
    };
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    if (error.response) {
      return {
        error: true,
        status: error.response.status,
        message: error.response.data.error || error.response.data.message || 'API request failed',
        data: error.response.data
      };
    }
    throw error;
  }
}

/**
 * Authentication Tests
 */
async function testAuthentication() {
  logger.info('=== Testing Authentication ===');
  
  // Login as each user type
  for (const [role, user] of Object.entries(testUsers)) {
    logger.info(`Logging in as ${role}...`);
    const loginData = {
      email: user.email,
      password: user.password
    };
    
    const response = await apiRequest('post', '/api/auth/login', loginData);
    
    if (response.error) {
      logger.error(`Failed to login as ${role}:`, response.message);
      process.exit(1);
    }
    
    tokens[role] = response.token;
    logger.info(`Successfully logged in as ${role}`);
    
    // Save the user ID if it's a consumer (will be used later)
    if (role === 'consumer') {
      testData.userId = response.user.id;
    }
  }
  
  logger.info('Authentication tests passed!');
}

/**
 * Dashboard Tests
 */
async function testDashboards() {
  logger.info('=== Testing Dashboard Endpoints ===');
  
  // Test Admin Dashboard
  logger.info('Testing Admin Dashboard...');
  const adminDashboard = await apiRequest('get', '/api/dashboard/admin', null, 'admin');
  assert(!adminDashboard.error, 'Admin dashboard access failed');
  logger.info('Admin dashboard test passed!');
  
  // Test Farmer Dashboard
  logger.info('Testing Farmer Dashboard...');
  // First get a farm ID
  const farmsResponse = await apiRequest('get', '/api/farms', null, 'farmer');
  if (farmsResponse.farms && farmsResponse.farms.length > 0) {
    testData.farmId = farmsResponse.farms[0].id;
    
    const farmerDashboard = await apiRequest('get', `/api/dashboard/farmer/${testData.farmId}`, null, 'farmer');
    assert(!farmerDashboard.error, 'Farmer dashboard access failed');
    logger.info('Farmer dashboard test passed!');
  } else {
    logger.error('No farms found for farmer user. Cannot test farmer dashboard.');
  }
  
  // Test Consumer Dashboard
  logger.info('Testing Consumer Dashboard...');
  const consumerDashboard = await apiRequest('get', `/api/dashboard/consumer/${testData.userId}`, null, 'consumer');
  assert(!consumerDashboard.error, 'Consumer dashboard access failed');
  logger.info('Consumer dashboard test passed!');
}

/**
 * Analytics Tests
 */
async function testAnalytics() {
  logger.info('=== Testing Analytics Endpoints ===');
  
  // Test User Order Stats
  logger.info('Testing User Order Stats...');
  const userOrderStats = await apiRequest('get', `/api/analytics/user/${testData.userId}/orders`, null, 'consumer');
  assert(!userOrderStats.error, 'User order stats access failed');
  logger.info('User order stats test passed!');
  
  // Test Farm Order Stats
  if (testData.farmId) {
    logger.info('Testing Farm Order Stats...');
    const farmOrderStats = await apiRequest('get', `/api/analytics/farm/${testData.farmId}/orders`, null, 'farmer');
    assert(!farmOrderStats.error, 'Farm order stats access failed');
    logger.info('Farm order stats test passed!');
  }
}

/**
 * Product Tests
 */
async function testProducts() {
  logger.info('=== Testing Product Endpoints ===');
  
  // Test Get All Products
  logger.info('Testing Get All Products...');
  const allProducts = await apiRequest('get', '/api/products', null, 'consumer');
  assert(!allProducts.error, 'Get all products failed');
  logger.info('Get all products test passed!');
  
  // Save first product ID for later tests
  if (allProducts.products && allProducts.products.length > 0) {
    testData.productId = allProducts.products[0].id;
  }
  
  // Test Get Product by ID
  if (testData.productId) {
    logger.info('Testing Get Product by ID...');
    const product = await apiRequest('get', `/api/products/${testData.productId}`, null, 'consumer');
    assert(!product.error, 'Get product by ID failed');
    logger.info('Get product by ID test passed!');
  }
}

/**
 * Order Tests
 */
async function testOrders() {
  logger.info('=== Testing Order Endpoints ===');
  
  // Test Create Order (consumer only)
  if (testData.productId) {
    logger.info('Testing Create Order...');
    const orderData = {
      items: [
        {
          productId: testData.productId,
          quantity: 2
        }
      ],
      deliveryAddress: '123 Test Street, Testville, CA 95123',
      paymentMethod: 'credit_card'
    };
    
    const createOrderResponse = await apiRequest('post', '/api/orders', orderData, 'consumer');
    assert(!createOrderResponse.error, 'Create order failed');
    testData.orderId = createOrderResponse.order.id;
    logger.info('Create order test passed!');
  }
  
  // Test Get Order by ID
  if (testData.orderId) {
    logger.info('Testing Get Order by ID...');
    const order = await apiRequest('get', `/api/orders/${testData.orderId}`, null, 'consumer');
    assert(!order.error, 'Get order by ID failed');
    logger.info('Get order by ID test passed!');
  }
  
  // Test Get All Orders for User
  logger.info('Testing Get All Orders for User...');
  const userOrders = await apiRequest('get', `/api/orders/user/${testData.userId}`, null, 'consumer');
  assert(!userOrders.error, 'Get all orders for user failed');
  logger.info('Get all orders for user test passed!');
}

/**
 * Permission Tests - testing JWT role-based permissions
 */
async function testPermissions() {
  logger.info('=== Testing Role-Based Permissions ===');
  
  // Test consumer cannot access admin dashboard
  logger.info('Testing role restriction: Consumer -> Admin Dashboard...');
  const consumerAccessAdmin = await apiRequest('get', '/api/dashboard/admin', null, 'consumer');
  assert(consumerAccessAdmin.error && consumerAccessAdmin.status === 403, 'Consumer should not access admin dashboard');
  logger.info('Role restriction test passed: Consumer cannot access Admin Dashboard');
  
  // Test consumer cannot access farmer dashboard
  if (testData.farmId) {
    logger.info('Testing role restriction: Consumer -> Farmer Dashboard...');
    const consumerAccessFarmer = await apiRequest('get', `/api/dashboard/farmer/${testData.farmId}`, null, 'consumer');
    assert(consumerAccessFarmer.error && consumerAccessFarmer.status === 403, 'Consumer should not access farmer dashboard');
    logger.info('Role restriction test passed: Consumer cannot access Farmer Dashboard');
  }
  
  // Test driver cannot create orders (not in their permissions)
  if (testData.productId) {
    logger.info('Testing permission restriction: Driver -> Create Order...');
    const orderData = {
      items: [
        {
          productId: testData.productId,
          quantity: 1
        }
      ],
      deliveryAddress: '123 Test Street, Testville, CA 95123',
      paymentMethod: 'credit_card'
    };
    
    const driverCreateOrder = await apiRequest('post', '/api/orders', orderData, 'driver');
    assert(driverCreateOrder.error && driverCreateOrder.status === 403, 'Driver should not be able to create orders');
    logger.info('Permission restriction test passed: Driver cannot create orders');
  }
}

/**
 * Farm Tests
 */
async function testFarms() {
  logger.info('=== Testing Farm Endpoints ===');
  
  // Test Get All Farms
  logger.info('Testing Get All Farms...');
  const allFarms = await apiRequest('get', '/api/farms', null, 'consumer');
  assert(!allFarms.error, 'Get all farms failed');
  logger.info('Get all farms test passed!');
  
  // Test Get Farm by ID
  if (testData.farmId) {
    logger.info('Testing Get Farm by ID...');
    const farm = await apiRequest('get', `/api/farms/${testData.farmId}`, null, 'consumer');
    assert(!farm.error, 'Get farm by ID failed');
    logger.info('Get farm by ID test passed!');
  }
  
  // Test Get Farm Products
  if (testData.farmId) {
    logger.info('Testing Get Farm Products...');
    const farmProducts = await apiRequest('get', `/api/farms/${testData.farmId}/products`, null, 'consumer');
    assert(!farmProducts.error, 'Get farm products failed');
    logger.info('Get farm products test passed!');
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  try {
    logger.info('Starting comprehensive API endpoint tests...');
    
    // First, make sure the server is running
    try {
      await axios.get(`${API_URL}/api/health`);
    } catch (error) {
      logger.error('Server does not appear to be running. Please start the server and try again.');
      process.exit(1);
    }
    
    // Run tests in sequence
    await testAuthentication();
    await testDashboards();
    await testAnalytics();
    await testProducts();
    await testOrders();
    await testFarms();
    await testPermissions();
    
    logger.info('🎉 All tests passed! The FreshFarmily backend is ready for production.');
  } catch (error) {
    logger.error('Test failed:', error);
    process.exit(1);
  }
}

// Run all tests
runAllTests();
