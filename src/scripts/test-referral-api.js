/**
 * Test Referral API Script
 * 
 * This script tests the fixed referral controller and service
 */

const { sequelize } = require('../config/database');
const referralController = require('../controllers/referralController');
const logger = require('../utils/logger');

async function testReferralApi() {
  try {
    logger.info('Starting referral API test');
    
    // Find a farmer user to test with
    const [farmers] = await sequelize.query(
      `SELECT id, email, "firstName", "lastName" FROM users WHERE role = 'farmer' LIMIT 1`
    );
    
    if (farmers.length === 0) {
      logger.error('No farmer user found for testing');
      return;
    }
    
    const farmer = farmers[0];
    logger.info(`Testing referral API with farmer: ${farmer.email} (${farmer.id})`);
    
    // Check if user has referral info
    const [referralInfo] = await sequelize.query(
      `SELECT * FROM referral_info WHERE "userId" = :userId`,
      {
        replacements: { userId: farmer.id },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!referralInfo) {
      logger.info('Creating referral info for testing');
      
      // Generate unique referral codes
      const farmerCode = `FF${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const customerCode = `FC${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      
      // Create test referral info
      await sequelize.query(`
        INSERT INTO referral_info (
          id,
          "userId", 
          "referralCode",
          "farmerReferralCode", 
          "customerReferralCode", 
          "referralStatus", 
          "remainingCredit", 
          "totalEarnedCredit",
          "freeDeliveriesRemaining", 
          "totalFreeDeliveries",
          "referralCount",
          "createdAt",
          "updatedAt"
        ) VALUES (
          gen_random_uuid(),
          :userId, 
          :farmerCode,
          :farmerCode, 
          :customerCode, 
          'active',
          0, 0, 0, 0, 0,
          NOW(),
          NOW()
        )
      `, {
        replacements: {
          userId: farmer.id,
          farmerCode,
          customerCode
        }
      });
      
      logger.info(`Created referral info with codes: ${farmerCode}, ${customerCode}`);
    } else {
      logger.info(`User already has referral info with farmerCode: ${referralInfo.farmerReferralCode || referralInfo.referralCode}`);
    }
    
    // Create a mock request and response
    const req = {
      user: { userId: farmer.id }
    };
    
    let responseData = null;
    
    // Mock response object
    const res = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        responseData = data;
        logger.info(`Response status: ${this.statusCode}`);
        logger.info('Response data:');
        console.log(JSON.stringify(data, null, 2));
        return this;
      }
    };
    
    // Call the getReferralInfo controller method
    logger.info('Calling referral controller...');
    await referralController.getReferralInfo(req, res);
    
    // Check the result
    if (responseData && responseData.success) {
      logger.info('Referral API test PASSED!');
    } else {
      logger.error('Referral API test FAILED!');
      if (responseData) {
        logger.error(`Error message: ${responseData.message}`);
      }
    }
    
    logger.info('Test completed');
  } catch (error) {
    logger.error(`Test error: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testReferralApi();
