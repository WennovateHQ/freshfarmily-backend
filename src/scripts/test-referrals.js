/**
 * Test Referrals API
 * 
 * This script tests the getReferralInfo function in the referral service
 */

const { sequelize } = require('../config/database');
const referralService = require('../services/referralService');
const { User } = require('../models/user');
const { ReferralInfo } = require('../models/referral');
const logger = require('../utils/logger');

async function testReferrals() {
  try {
    logger.info('Starting referral service test');
    
    // Get a farmer user to test with
    const farmer = await User.findOne({
      where: { role: 'farmer' },
      attributes: ['id', 'email', 'firstName', 'lastName', 'role']
    });
    
    if (!farmer) {
      logger.error('No farmer user found for testing');
      return;
    }
    
    logger.info(`Testing referral functionality for farmer user: ${farmer.email} (${farmer.id})`);
    
    // Check if referral info exists for this user
    let referralInfo = await ReferralInfo.findOne({ 
      where: { userId: farmer.id } 
    });
    
    // If no referral info exists, create it
    if (!referralInfo) {
      logger.info(`No referral info found for user ${farmer.id}, creating it now...`);
      
      // Create referral info
      referralInfo = await referralService.createOrUpdateReferralInfo(farmer.id, farmer.role);
      
      if (!referralInfo) {
        logger.error('Failed to create referral info');
        return;
      }
      
      logger.info(`Created referral info for user ${farmer.id}`);
    }
    
    // Check if the referral codes exist
    if (!referralInfo.farmerReferralCode) {
      logger.info(`Generating referral codes for user ${farmer.id}...`);
      // Update the referral info with proper codes
      referralInfo.farmerReferralCode = `FF${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      referralInfo.customerReferralCode = `FC${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      await referralInfo.save();
      logger.info(`Updated referral info with codes: farmer=${referralInfo.farmerReferralCode}, customer=${referralInfo.customerReferralCode}`);
    }
    
    // Print the referral info
    logger.info('Current referral info:');
    console.log(JSON.stringify({
      id: referralInfo.id,
      userId: referralInfo.userId,
      farmerReferralCode: referralInfo.farmerReferralCode,
      customerReferralCode: referralInfo.customerReferralCode,
      referralStatus: referralInfo.referralStatus,
      remainingCredit: referralInfo.remainingCredit,
      totalEarnedCredit: referralInfo.totalEarnedCredit,
      freeDeliveriesRemaining: referralInfo.freeDeliveriesRemaining,
      totalFreeDeliveries: referralInfo.totalFreeDeliveries
    }, null, 2));
    
    // Test getReferralStats
    logger.info('Testing getReferralStats function...');
    const stats = await referralService.getReferralStats(farmer.id);
    logger.info('Referral stats retrieved successfully:');
    console.log(JSON.stringify(stats, null, 2));
    
    logger.info('Referral service test completed successfully');
  } catch (error) {
    logger.error(`Error testing referral service: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
  }
}

// Run the test
testReferrals();
