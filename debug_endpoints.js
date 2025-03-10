/**
 * Endpoint Debugging Script
 * 
 * This script directly tests problematic endpoints with detailed debugging
 */

const axios = require('axios');
require('dotenv').config();

// API base URL
const API_URL = 'http://localhost:8000/api';

// Test user credentials
const adminUser = { email: 'admin@freshfarmily.com', password: 'admin123' };

// Function to make direct API calls with detailed logging
async function testEndpoint(token, endpoint, method = 'get', data = null) {
  try {
    console.log(`\n🔍 Testing ${method.toUpperCase()} ${endpoint}`);
    
    const config = {
      headers: token ? { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      } : {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: false // Accept any status code to see all responses
    };
    
    console.log(`📡 Request Headers: ${JSON.stringify(config.headers)}`);
    if (data) {
      console.log(`📦 Request Body: ${JSON.stringify(data)}`);
    }
    
    let response;
    if (method.toLowerCase() === 'get') {
      response = await axios.get(`${API_URL}${endpoint}`, config);
    } else if (method.toLowerCase() === 'post') {
      response = await axios.post(`${API_URL}${endpoint}`, data, config);
    }
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Success!');
      console.log(`🔑 Response Headers: ${JSON.stringify(response.headers)}`);
      
      // For larger responses, just log part of the data
      if (response.data && typeof response.data === 'object') {
        const dataKeys = Object.keys(response.data);
        console.log(`📄 Response Keys: ${dataKeys.join(', ')}`);
        
        if (dataKeys.includes('totalCount') || dataKeys.includes('count')) {
          console.log(`📊 Count: ${response.data.totalCount || response.data.count}`);
        }
        
        if (Array.isArray(response.data.farms)) {
          console.log(`📊 Farm Count: ${response.data.farms.length}`);
        }
        
        if (Array.isArray(response.data.products)) {
          console.log(`📊 Product Count: ${response.data.products.length}`);
        }
      } else {
        console.log(`📄 Response Data: ${JSON.stringify(response.data)}`);
      }
    } else {
      console.log('❌ Error!');
      console.log(`📄 Error Data: ${JSON.stringify(response.data)}`);
    }
    
    return response;
  } catch (error) {
    console.error(`❌ Request Failed: ${error.message}`);
    if (error.response) {
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📄 Error Data: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Login function with detailed debugging
async function login(email, password) {
  try {
    console.log(`🔐 Logging in as ${email}...`);
    
    const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      validateStatus: false
    });
    
    if (response.status === 200 && response.data && response.data.access_token) {
      console.log(`✅ Login successful as ${email}`);
      return response.data.access_token;
    } else {
      console.log(`❌ Login failed with status ${response.status}`);
      console.log(response.data);
      return null;
    }
  } catch (error) {
    console.error(`❌ Login error: ${error.message}`);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🔍 Starting Endpoint Debugging');
  console.log('===========================');
  
  // Test with no authentication
  console.log('\n🔬 TESTING WITHOUT AUTHENTICATION');
  await testEndpoint(null, '/farms');
  await testEndpoint(null, '/products');
  
  // Test with authentication
  console.log('\n🔬 TESTING WITH ADMIN AUTHENTICATION');
  const adminToken = await login(adminUser.email, adminUser.password);
  
  if (adminToken) {
    // Test authenticated endpoints
    await testEndpoint(adminToken, '/farms');
    await testEndpoint(adminToken, '/products');
    
    // Test create farm
    const farmData = {
      name: 'Test Farm',
      description: 'A test farm for API testing',
      address: '123 Test Street',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
      phone: '555-123-4567',
      email: 'test@farm.com'
    };
    await testEndpoint(adminToken, '/farms', 'post', farmData);
  }
  
  console.log('\n===========================');
  console.log('🏁 Endpoint Testing Complete');
}

// Run the tests
runTests().catch(err => {
  console.error('Unhandled error:', err);
});
