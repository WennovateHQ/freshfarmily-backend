/**
 * Test script to diagnose farm creation issues
 */

require('dotenv').config();
const axios = require('axios');
const { logger } = require('../utils/logger');

// Mock farm data that simulates what the frontend would send
const mockFarmData = {
  name: 'Test Farm',
  description: 'A test farm to diagnose API issues',
  address: '123 Test Street',
  city: 'Test City',
  province: 'ON',  // Using Ontario as test province
  postalCode: 'A1A 1A1',  // Test postal code
  phoneNumber: '555-555-5555',
  email: 'test@example.com',
  website: 'https://example.com',
  deliveryRange: 25,
  deliveryFee: 5,
  acceptsDelivery: true,
  isDefault: false,
  certifications: ['Organic', 'Local']
};

// Function to simulate the same transformation the frontend would do
function mapFrontendToBackend(data) {
  const mappedData = { ...data };
  
  // Map postalCode to zipCode
  if (mappedData.postalCode) {
    mappedData.zipCode = mappedData.postalCode.replace(/\s+/g, '');
    delete mappedData.postalCode;
  }
  
  return mappedData;
}

// This is just a test script - in real usage, you would get a JWT token
// through authentication. For testing, we can create a mock token or use
// direct database access instead of the API.

async function testCreateFarm() {
  try {
    // Display the data we're about to test with
    console.log('Testing farm creation with data:');
    console.log(JSON.stringify(mapFrontendToBackend(mockFarmData), null, 2));
    
    // Show how this data would be validated/transformed on the backend
    console.log('\nOn the backend, we would receive:');
    const backendData = mapFrontendToBackend(mockFarmData);
    
    // Show the field mapping that happens on the backend
    if (backendData.province) {
      backendData.state = backendData.province;
      delete backendData.province;
    }
    console.log(JSON.stringify(backendData, null, 2));
    
    console.log('\nCheck if there are any field name mismatches or validation issues');
    // List out the expected fields in the Farm model
    console.log('Expected fields in Farm model: name, description, address, city, state, zipCode, etc.');
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

testCreateFarm();
