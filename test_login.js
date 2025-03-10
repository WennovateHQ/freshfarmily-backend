/**
 * Debug Authentication Script
 * 
 * A simple script to test login with one user and display detailed debugging information
 */

const axios = require('axios');
require('dotenv').config();

// API base URL
const API_URL = 'http://localhost:8000/api';

// Test user credentials
const testUser = { email: 'admin@freshfarmily.com', password: 'admin123' };

// Login function with detailed debugging
async function loginWithDebug(email, password) {
  try {
    console.log(`🔍 Attempting login for ${email} with password ${password.replace(/./g, '*')}`);
    
    // Log request details
    console.log(`📡 Sending POST request to: ${API_URL}/auth/login`);
    console.log(`📦 Request body: ${JSON.stringify({ email, password })}`);
    
    // Make the login request
    const response = await axios.post(`${API_URL}/auth/login`, { email, password }, {
      validateStatus: false, // Accept any status code to see detailed errors
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Log detailed response information
    console.log(`\n✅ Response received:`);
    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`🔑 Headers: ${JSON.stringify(response.headers, null, 2)}`);
    console.log(`📄 Data: ${JSON.stringify(response.data, null, 2)}`);
    
    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    console.error(`\n❌ Error occurred:`);
    
    if (error.response) {
      // Server responded with error status
      console.error(`📊 Status: ${error.response.status}`);
      console.error(`📄 Response data: ${JSON.stringify(error.response.data, null, 2)}`);
      console.error(`🔑 Response headers: ${JSON.stringify(error.response.headers, null, 2)}`);
    } else if (error.request) {
      // Request was made but no response received
      console.error(`⚠️ No response received from server`);
      console.error(error.request);
    } else {
      // Error in setting up the request
      console.error(`⚠️ Error setting up request: ${error.message}`);
    }
    
    if (error.config) {
      console.error(`📡 Request configuration: ${JSON.stringify({
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers,
        data: error.config.data
      }, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message,
      details: error.response?.data || {}
    };
  }
}

// Run the test
async function runTest() {
  console.log('🔐 Starting Detailed Authentication Debug');
  console.log('===========================================');
  
  const result = await loginWithDebug(testUser.email, testUser.password);
  
  console.log('\n📋 Summary:');
  if (result.success) {
    console.log('✅ Authentication succeeded');
  } else {
    console.log('❌ Authentication failed');
  }
  
  console.log('===========================================');
}

// Run the test
runTest().catch(error => {
  console.error('Unhandled error:', error);
});
