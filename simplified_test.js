/**
 * Simplified Test for Specific Endpoints
 * 
 * Tests the /farms and /products endpoints with test mode enabled
 */

const axios = require('axios');
require('dotenv').config();

// Set environment variables explicitly 
process.env.TESTING = 'true';
process.env.NODE_ENV = 'test';

// API base URL
const API_URL = 'http://localhost:8000/api';

// Function to make a single request to an endpoint
async function testEndpoint(endpoint) {
  try {
    console.log(`\n🔍 Testing GET ${endpoint}`);
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      params: {
        _test: true // Additional query parameter to indicate test mode
      },
      validateStatus: false // Accept any status code to see all responses
    };
    
    const response = await axios.get(`${API_URL}${endpoint}`, config);
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('✅ Success!');
      
      // For larger responses, just log part of the data
      if (response.data && typeof response.data === 'object') {
        console.log(`📄 Response Keys: ${Object.keys(response.data).join(', ')}`);
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

// Run just the essential tests
async function runTests() {
  console.log('🔍 Starting Simplified Endpoint Test');
  console.log('===================================');
  
  console.log('Testing with TESTING=true environment variable');
  console.log(`TESTING env value: ${process.env.TESTING}`);
  console.log(`NODE_ENV value: ${process.env.NODE_ENV}`);
  
  // Test farms endpoint
  await testEndpoint('/farms');
  
  // Test products endpoint
  await testEndpoint('/products');
  
  console.log('\n===================================');
  console.log('🏁 Tests completed');
}

// Run the simplified tests
runTests().catch(err => {
  console.error('Unhandled error:', err);
});
