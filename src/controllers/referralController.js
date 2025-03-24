/**
 * Referral Controller
 * 
 * Handles all referral-related API requests
 */

const referralService = require('../services/referralService');
const { ReferralInfo, ReferralHistory } = require('../models/referral');
const { User } = require('../models/user');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get referral information and stats for a user
 */
async function getReferralInfo(req, res) {
  try {
    const userId = req.user.userId;
    
    // Get referral stats and information from the service
    const referralStats = await referralService.getReferralStats(userId);
    
    if (!referralStats.success) {
      return res.status(404).json({
        success: false,
        message: referralStats.message
      });
    }
    
    // Add calculated fields for the frontend
    const { stats } = referralStats;
    if (stats) {
      stats.pendingReferrals = referralStats.referredUsers?.filter(u => u.rewardType === 'pending').length || 0;
      stats.completedReferrals = stats.totalReferrals - stats.pendingReferrals;
    }
    
    // Add limits information to the response
    referralStats.limits = {
      maxLifetimeFreeDeliveries: referralService.MAX_LIFETIME_FREE_DELIVERIES,
      maxLifetimeCashback: referralService.MAX_LIFETIME_CASHBACK,
      freeDeliveriesPerReferral: referralService.FREE_DELIVERIES_COUNT,
      cashbackPerReferral: referralService.FARMER_REFERRAL_CASHBACK
    };
    
    return res.status(200).json(referralStats);
  } catch (error) {
    logger.error(`Error in getReferralInfo controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve referral information'
    });
  }
}

/**
 * Get referral history for a user
 */
async function getReferralHistory(req, res) {
  try {
    const userId = req.user.userId;
    
    // Get referral stats which includes history
    const referralStats = await referralService.getReferralStats(userId);
    
    if (!referralStats.success) {
      return res.status(404).json({
        success: false,
        message: referralStats.message
      });
    }
    
    return res.status(200).json({
      success: true,
      referredUsers: referralStats.referredUsers || []
    });
  } catch (error) {
    logger.error(`Error in getReferralHistory controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve referral history'
    });
  }
}

/**
 * Apply a referral code when registering
 */
async function applyReferralCode(req, res) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { code, userId, userRole } = req.body;

    // Validate that the user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if the user already has referral info
    const existingReferralInfo = await ReferralInfo.findOne({ where: { userId } });
    if (existingReferralInfo && existingReferralInfo.referrerCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already has applied a referral code' 
      });
    }

    // Apply the referral code
    const result = await referralService.applyReferralCode(code, userId, userRole);
    
    if (result.success) {
      // Determine the appropriate reward description based on the userRole
      let rewardDescription = '';
      if (userRole === 'farmer') {
        rewardDescription = `$${referralService.REFERRAL_CONSTANTS.CASHBACK_PER_FARMER_REFERRAL} cashback after your first sale`;
      } else { // consumer
        rewardDescription = `${referralService.REFERRAL_CONSTANTS.FREE_DELIVERIES_PER_REFERRAL} free deliveries`;
      }

      return res.status(200).json({
        success: true,
        message: 'Referral code applied successfully',
        referralType: result.referralType,
        reward: rewardDescription
      });
    }

    return res.status(400).json({
      success: false,
      message: result.message
    });

  } catch (error) {
    logger.error('Error applying referral code:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

/**
 * Check if a user has free deliveries available
 */
async function checkFreeDeliveries(req, res) {
  try {
    const userId = req.user.userId;
    
    // Get user's referral info
    const referralInfo = await ReferralInfo.findOne({
      where: { userId }
    });
    
    if (!referralInfo) {
      return res.status(200).json({
        success: true,
        hasFreeDeliveries: false,
        freeDeliveriesRemaining: 0,
        totalFreeDeliveries: 0,
        maxLifetimeFreeDeliveries: referralService.REFERRAL_CONSTANTS.MAX_LIFETIME_FREE_DELIVERIES
      });
    }
    
    return res.status(200).json({
      success: true,
      hasFreeDeliveries: referralInfo.freeDeliveriesRemaining > 0,
      freeDeliveriesRemaining: referralInfo.freeDeliveriesRemaining,
      totalFreeDeliveries: referralInfo.totalFreeDeliveries,
      maxLifetimeFreeDeliveries: referralService.REFERRAL_CONSTANTS.MAX_LIFETIME_FREE_DELIVERIES
    });
  } catch (error) {
    logger.error(`Error in checkFreeDeliveries controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check free deliveries'
    });
  }
}

/**
 * Generate a referral code for a user if they don't have one
 */
async function generateReferralCode(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    
    // Create or update referral info
    const referralInfo = await referralService.createOrUpdateReferralInfo(userId, role);
    
    // Generate unique referral codes if they were not assigned
    if (!referralInfo.farmerReferralCode) {
      const farmerCode = await referralService.generateUniqueReferralCode('FF');
      await referralInfo.update({ farmerReferralCode: farmerCode });
    }
    
    if (!referralInfo.customerReferralCode) {
      const customerCode = await referralService.generateUniqueReferralCode('FC');
      await referralInfo.update({ customerReferralCode: customerCode });
    }
    
    return res.status(200).json({
      success: true,
      farmerReferralCode: referralInfo.farmerReferralCode,
      customerReferralCode: referralInfo.customerReferralCode
    });
  } catch (error) {
    logger.error(`Error in generateReferralCode controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to generate referral code'
    });
  }
}

/**
 * Get just the referral codes for a user
 */
async function getReferralCodes(req, res) {
  try {
    const userId = req.user.userId;
    const role = req.user.role;
    
    // Get user's referral info
    let referralInfo = await ReferralInfo.findOne({
      where: { userId }
    });
    
    if (!referralInfo) {
      // Generate new referral info if it doesn't exist
      referralInfo = await referralService.createOrUpdateReferralInfo(userId, role);
      
      // Generate unique referral codes if needed
      if (!referralInfo.farmerReferralCode) {
        const farmerCode = await referralService.generateUniqueReferralCode('FF');
        await referralInfo.update({ farmerReferralCode: farmerCode });
      }
      
      if (!referralInfo.customerReferralCode) {
        const customerCode = await referralService.generateUniqueReferralCode('FC');
        await referralInfo.update({ customerReferralCode: customerCode });
      }
    }
    
    // Determine which code to provide based on user role
    return res.status(200).json({
      success: true,
      referralCode: role === 'farmer' ? referralInfo.farmerReferralCode : referralInfo.customerReferralCode,
      referralInfo: {
        farmerReferralCode: referralInfo.farmerReferralCode,
        customerReferralCode: referralInfo.customerReferralCode,
        freeDeliveriesRemaining: referralInfo.freeDeliveriesRemaining,
        totalFreeDeliveries: referralInfo.totalFreeDeliveries,
        remainingCredit: referralInfo.remainingCredit,
        totalEarnedCredit: referralInfo.totalEarnedCredit
      },
      limits: {
        maxLifetimeFreeDeliveries: referralService.MAX_LIFETIME_FREE_DELIVERIES,
        maxLifetimeCashback: referralService.MAX_LIFETIME_CASHBACK,
        freeDeliveriesPerReferral: referralService.FREE_DELIVERIES_COUNT,
        cashbackPerReferral: referralService.FARMER_REFERRAL_CASHBACK
      }
    });
  } catch (error) {
    logger.error(`Error in getReferralCodes controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get referral codes'
    });
  }
}

/**
 * Validate a referral code
 */
async function validateReferralCode(req, res) {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is required'
      });
    }
    
    // Find referral info by code
    const referrerInfo = await ReferralInfo.findOne({
      where: {
        [sequelize.Op.or]: [
          { farmerReferralCode: code },
          { customerReferralCode: code }
        ]
      },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'role']
      }]
    });
    
    if (!referrerInfo) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Invalid referral code'
      });
    }
    
    // Check if the code owner's account is active
    const userRole = referrerInfo.User.role;
    
    return res.status(200).json({
      success: true,
      valid: true,
      referrerRole: userRole,
      referrerId: referrerInfo.userId,
      // Determine code type
      codeType: code === referrerInfo.farmerReferralCode ? 'farmer' : 'customer',
      rewards: {
        freeDeliveriesPerReferral: referralService.REFERRAL_CONSTANTS.FREE_DELIVERIES_PER_REFERRAL,
        cashbackPerReferral: referralService.REFERRAL_CONSTANTS.CASHBACK_PER_FARMER_REFERRAL
      }
    });
  } catch (error) {
    logger.error(`Error in validateReferralCode controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to validate referral code'
    });
  }
}

/**
 * Apply farmer referral cashback
 */
async function applyFarmerReferralCashback(req, res) {
  try {
    const farmerId = req.body.farmerId || req.user.userId;
    
    // Verify the user is a farmer
    const farmer = await User.findOne({
      where: { id: farmerId, role: 'farmer' }
    });
    
    if (!farmer) {
      return res.status(400).json({
        success: false,
        message: 'Invalid farmer ID or user is not a farmer'
      });
    }
    
    // Apply cashback
    const result = await referralService.applyFarmerReferralCashback(farmerId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message
      });
    }
    
    return res.status(200).json({
      success: true,
      message: result.message,
      cashbackAmount: result.cashbackAmount,
      maxLifetimeCashback: referralService.REFERRAL_CONSTANTS.MAX_LIFETIME_CASHBACK
    });
  } catch (error) {
    logger.error(`Error in applyFarmerReferralCashback controller: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to apply farmer referral cashback'
    });
  }
}

module.exports = {
  getReferralInfo,
  getReferralHistory,
  applyReferralCode,
  checkFreeDeliveries,
  generateReferralCode,
  getReferralCodes,
  validateReferralCode,
  applyFarmerReferralCashback
};
