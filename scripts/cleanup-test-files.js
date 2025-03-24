/**
 * Production Cleanup Script
 * 
 * This script removes test-related files that are not needed in production
 */

const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');

// List of test files to remove (relative to project root)
const testFiles = [
  'comprehensive_test.js',
  'create-test-user.js',
  'final-test-connection.js',
  'register-test-user.js',
  'scripts/create-test-user.js',
  'scripts/create-test-users.js',
  'scripts/reset-test-users.js',
  'scripts/test-auth.js',
  'scripts/test-login.js',
  'simplified_test.js',
  'src/scripts/create-test-user.js',
  'src/tests/integration/pricing-api-test.js',
  'test-api-endpoints.js',
  'test-backend-auth.js',
  'test-connection.js',
  'test-db-connection.js',
  'test-jwt-auth.js',
  'test-login.js',
  'test_all_endpoints.js',
  'test_auth.js',
  'test_endpoints.js',
  'test_login.js'
];

// Root directory
const rootDir = path.resolve(__dirname, '..');

// Function to delete a file
function deleteFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.info(`Successfully deleted: ${filePath}`);
      return true;
    } else {
      logger.warn(`File not found: ${filePath}`);
      return false;
    }
  } catch (error) {
    logger.error(`Failed to delete ${filePath}: ${error.message}`);
    return false;
  }
}

// Main cleanup function
async function cleanupTestFiles() {
  logger.info('Starting cleanup of test files...');
  
  let deletedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  
  for (const file of testFiles) {
    const result = deleteFile(file);
    if (result === true) {
      deletedCount++;
    } else if (result === false) {
      notFoundCount++;
    } else {
      errorCount++;
    }
  }
  
  logger.info('Test files cleanup completed');
  logger.info(`Summary: ${deletedCount} files deleted, ${notFoundCount} files not found, ${errorCount} errors.`);
}

// Run the cleanup
cleanupTestFiles();
