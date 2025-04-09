/**
 * Test Referrals API
 * 
 * This script tests the referral API endpoint directly
 */

const { sequelize } = require('../config/database');
const { User } = require('../models/user');
const { ReferralInfo } = require('../models/referral');
const referralController = require('../controllers/referralController');
const logger = require('../utils/logger');

async function testReferralsApi() {
  try {
    logger.info('Starting referral API test');
    
    // Get a farmer user to test with
    const farmer = await User.findOne({
      where: { role: 'farmer' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'role']
    });
    
    if (!farmer) {
      logger.error('No farmer user found for testing');
      return;
    }
    
    logger.info(`Testing referrals API with farmer user: ${farmer.email} (${farmer.id})`);
    
    // Ensure the farmer has referral info
    let referralInfo = await ReferralInfo.findOne({ 
      where: { userId: farmer.id } 
    });
    
    if (!referralInfo) {
      logger.info(`Creating referral info for farmer: ${farmer.email}`);
      
      // Create a new referral info record
      referralInfo = await ReferralInfo.create({
        userId: farmer.id,
        farmerReferralCode: `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        customerReferralCode: `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        referralStatus: 'active',
        remainingCredit: 0,
        totalEarnedCredit: 0,
        freeDeliveriesRemaining: 0,
        totalFreeDeliveries: 0
      });
      
      logger.info(`Created referral info with codes: ${referralInfo.farmerReferralCode}, ${referralInfo.customerReferralCode}`);
    }
    
    // Mock Express request and response objects
    const req = {
      user: { userId: farmer.id }
    };
    
    // Create a mock response object
    const res = {
      status: function(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json: function(data) {
        this.data = data;
        logger.info(`Response status: ${this.statusCode}`);
        logger.info('Response data:');
        console.log(JSON.stringify(data, null, 2));
        return this;
      }
    };
    
    // Call the controller function directly
    logger.info('Calling getReferralInfo controller');
    await referralController.getReferralInfo(req, res);
    
    logger.info('Test completed successfully');
  } catch (error) {
    logger.error(`Error in test: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testReferralsApi();
