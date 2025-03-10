/**
 * Comprehensive Test Script for FreshFarmily API
 * 
 * This script tests the API endpoints with proper authentication and permission handling
 */

const axios = require('axios');
require('dotenv').config();

// API base URL
const API_URL = 'http://localhost:8000/api';

// Credentials for different user roles
const users = {
  admin: { email: 'admin@freshfarmily.com', password: 'admin123' },
  farmer: { email: 'farmer@freshfarmily.com', password: 'farmer123' },
  driver: { email: 'driver@freshfarmily.com', password: 'driver123' },
  consumer: { email: 'consumer@freshfarmily.com', password: 'consumer123' }
};

// Store tokens for different users
const tokens = {};

// Function to login and get a token
async function login(userType) {
  try {
    console.log(`🔑 Logging in as ${userType}...`);
    
    const user = users[userType];
    if (!user) {
      console.error(`❌ Invalid user type: ${userType}`);
      return null;
    }
    
    // Skip login if we already have the token
    if (tokens[userType]) {
      console.log(`✅ Using cached token for ${userType}`);
      return tokens[userType];
    }
    
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: user.email,
      password: user.password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.access_token) {
      console.log(`✅ Login successful for ${userType}`);
      tokens[userType] = response.data.access_token;
      return response.data.access_token;
    } else {
      console.error(`❌ Login failed for ${userType}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error logging in as ${userType}:`, error.message);
    return null;
  }
}

// Function to test an endpoint with authentication
async function testAuthenticatedEndpoint(endpoint, method = 'get', userType = 'admin', data = null) {
  try {
    // Get token for the specified user type
    const token = await login(userType);
    if (!token) {
      console.error(`❌ Cannot test endpoint without valid token for ${userType}`);
      return null;
    }
    
    console.log(`\n🔍 Testing ${method.toUpperCase()} ${endpoint} as ${userType}`);
    
    // Configure headers with authentication
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      // Allow testing to see specific error codes
      validateStatus: function (status) {
        return true; // Accept any status code
      }
    };
    
    // Make the request with the appropriate method
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(`${API_URL}${endpoint}`, config);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(`${API_URL}${endpoint}`, data, config);
    } else if (method.toLowerCase() === 'put') {
      response = await axios.put(`${API_URL}${endpoint}`, data, config);
    } else if (method.toLowerCase() === 'delete') {
      response = await axios.delete(`${API_URL}${endpoint}`, config);
    }
    
    // Process and display the response
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Success!');
      // For larger responses, just log a summary
      if (response.data && typeof response.data === 'object') {
        if (Array.isArray(response.data)) {
          console.log(`📄 Array response with ${response.data.length} items`);
        } else {
          console.log(`📄 Response Keys: ${Object.keys(response.data).join(', ')}`);
        }
      } else {
        console.log(`📄 Response: ${JSON.stringify(response.data)}`);
      }
    } else {
      console.log('❌ Error!');
      console.log(`📄 Error Data: ${JSON.stringify(response.data)}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Request Failed: ${error.message}`);
    return null;
  }
}

// Function to test permissions across different user roles
async function testEndpointAcrossRoles(endpoint, method = 'get', data = null) {
  console.log(`\n🔒 Testing ${method.toUpperCase()} ${endpoint} across all user roles`);
  console.log('--------------------------------------------');
  
  // Test with each user role
  for (const role of ['admin', 'farmer', 'driver', 'consumer']) {
    await testAuthenticatedEndpoint(endpoint, method, role, data);
  }
  
  console.log('--------------------------------------------');
}

// Main function to run all tests
async function runAllTests() {
  console.log('🧪 Starting Comprehensive API Tests');
  console.log('=====================================');
  
  console.log('\n📋 TESTING BASIC ENDPOINTS');
  
  // Farm endpoints
  await testEndpointAcrossRoles('/farms');
  
  // Product endpoints
  await testEndpointAcrossRoles('/products');
  
  // Test farm creation (admin only)
  const farmData = {
    name: 'Test Farm',
    description: 'A test farm created via API test',
    address: '123 Test St',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    phone: '555-123-4567',
    email: 'test@testfarm.com'
  };
  await testAuthenticatedEndpoint('/farms', 'post', 'admin', farmData);
  
  console.log('\n=====================================');
  console.log('🏁 Comprehensive API Tests Completed');
}

// Run all tests
runAllTests().catch(err => {
  console.error('❌ Unhandled error:', err);
});
