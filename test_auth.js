/**
 * JWT Authentication and Permissions Test Script
 * 
 * This script tests the JWT authentication system and role-based permissions
 * by logging in with different user roles and making API requests.
 */

const axios = require('axios');
require('dotenv').config();

// API base URL
const API_URL = 'http://localhost:8000/api';

// Test user credentials
const testUsers = [
  { role: 'admin', email: 'admin@freshfarmily.com', password: 'admin123' },
  { role: 'farmer', email: 'farmer@freshfarmily.com', password: 'farmer123' },
  { role: 'driver', email: 'driver@freshfarmily.com', password: 'driver123' },
  { role: 'consumer', email: 'consumer@freshfarmily.com', password: 'consumer123' }
];

// Endpoint permission requirements mapping
const endpointTests = [
  { endpoint: '/users', method: 'get', description: 'List all users', requiredPermission: 'admin' },
  { endpoint: '/farms', method: 'get', description: 'List all farms', requiredPermission: 'read' },
  { endpoint: '/farms', method: 'post', description: 'Create a farm', requiredPermission: 'write' },
  { endpoint: '/products', method: 'get', description: 'List all products', requiredPermission: 'read' },
  { endpoint: '/orders', method: 'get', description: 'List all orders', requiredPermission: 'read' },
  { endpoint: '/orders', method: 'post', description: 'Create an order', requiredPermission: 'create_order', 
    data: {
      items: [{ productId: 'test-product-id', quantity: 1 }],
      deliveryAddress: '123 Test St',
      deliveryCity: 'Test City',
      deliveryState: 'TS',
      deliveryZipCode: '12345',
      paymentMethod: 'card'
    }
  }
];

// Login function
async function login(email, password) {
  try {
    console.log(`Attempting login for ${email}...`);
    const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    console.log(`Login successful for ${email}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`Login failed for ${email}:`, error.response.data);
    } else {
      console.error(`Login failed for ${email}:`, error.message);
    }
    return null;
  }
}

// Test API access with token
async function testAccess(token, endpoint, method, description, data) {
  try {
    const config = {
      headers: { Authorization: `Bearer ${token}` }
    };
    
    let response;
    if (method === 'get') {
      response = await axios.get(`${API_URL}${endpoint}`, config);
    } else if (method === 'post') {
      response = await axios.post(`${API_URL}${endpoint}`, data, config);
    }
    
    return {
      success: true,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      status: error.response?.status,
      error: error.response?.data || error.message
    };
  }
}

// Parse token to extract claims
function parseJwt(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch (e) {
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🔐 Starting JWT Authentication and Permissions Tests');
  console.log('====================================================');
  
  for (const user of testUsers) {
    console.log(`\n👤 Testing ${user.role.toUpperCase()} user: ${user.email}`);
    console.log('-'.repeat(50));
    
    // Login
    const authResult = await login(user.email, user.password);
    if (!authResult || !authResult.access_token) {
      console.log(`❌ Login failed for ${user.email}`);
      continue;
    }
    
    console.log('✅ Login successful');
    
    // Analyze token
    const tokenData = parseJwt(authResult.access_token);
    if (tokenData) {
      console.log(`📝 Token issued to user ID: ${tokenData.userId}`);
      console.log(`📝 User role: ${tokenData.role}`);
      console.log(`📝 User permissions: ${JSON.stringify(tokenData.permissions || [])}`);
      console.log(`📝 Token expires: ${new Date(tokenData.exp * 1000).toLocaleString()}`);
    }
    
    // Test endpoints
    console.log('\n🧪 Testing API access with this token:');
    for (const test of endpointTests) {
      const result = await testAccess(authResult.access_token, test.endpoint, test.method, test.description, test.data);
      
      if (result.success) {
        console.log(`✅ ${test.method.toUpperCase()} ${test.endpoint} - ${test.description}: Access granted (${result.status})`);
      } else {
        console.log(`❌ ${test.method.toUpperCase()} ${test.endpoint} - ${test.description}: Access denied (${result.status})`);
      }
    }
  }
  
  console.log('\n====================================================');
  console.log('🏁 JWT Authentication and Permissions Tests completed');
}

// Run tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});
