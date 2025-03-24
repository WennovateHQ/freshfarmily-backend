/**
 * Referral Service
 * 
 * Handles the FreshFarmily referral program functionality including:
 * - Referral code creation and validation
 * - Reward processing for different referral types
 * - Free delivery tracking and application
 * - Cashback calculation and tracking for farmers
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');
const { ReferralInfo, ReferralHistory } = require('../models/referral');
const { User } = require('../models/user');

/**
 * Constants for the referral program
 */
const REFERRAL_CONSTANTS = {
  MAX_LIFETIME_FREE_DELIVERIES: 30, // Maximum number of lifetime free deliveries a user can get from referrals
  MAX_LIFETIME_CASHBACK: 300,       // Maximum lifetime cashback amount in dollars
  FREE_DELIVERIES_PER_REFERRAL: 3,  // Number of free deliveries per successful referral
  CASHBACK_PER_FARMER_REFERRAL: 30, // Amount of cashback in dollars per successful farmer referral
};

/**
 * Create or update referral info for a user
 * @param {String} userId - User ID
 * @param {String} role - User role (farmer, consumer)
 * @returns {Object} Referral info object
 */
const createOrUpdateReferralInfo = async (userId, role) => {
  try {
    // Check if referral info already exists
    let referralInfo = await ReferralInfo.findOne({
      where: { userId }
    });
    
    if (referralInfo) {
      logger.debug(`Referral info already exists for user ${userId}`);
      return referralInfo;
    }
    
    // Create new referral info with unique codes
    referralInfo = await ReferralInfo.create({
      userId,
      referralStatus: 'pending'
    });
    
    logger.info(`Created referral info for user ${userId}, role: ${role}`);
    return referralInfo;
  } catch (error) {
    logger.error(`Error creating referral info: ${error.message}`);
    throw error;
  }
};

/**
 * Generate a unique referral code
 * @param {String} prefix - Prefix for the code (FF for farmer, FC for customer)
 * @returns {String} Unique referral code
 */
const generateUniqueReferralCode = async (prefix) => {
  const crypto = require('crypto');
  let isUnique = false;
  let code;
  
  while (!isUnique) {
    // Generate code with a prefix plus random alphanumeric characters
    code = prefix + crypto.randomBytes(4).toString('hex').toUpperCase();
    
    // Check if code already exists
    const existingWithFarmerCode = await ReferralInfo.findOne({
      where: { farmerReferralCode: code }
    });
    
    const existingWithCustomerCode = await ReferralInfo.findOne({
      where: { customerReferralCode: code }
    });
    
    isUnique = !existingWithFarmerCode && !existingWithCustomerCode;
  }
  
  return code;
};

/**
 * Process a referral when a new user registers
 * @param {String} referralCode - The referral code used
 * @param {String} newUserId - ID of the newly registered user
 * @param {String} newUserRole - Role of the newly registered user (farmer, consumer)
 * @returns {Object} Referral processing result
 */
const processReferral = async (referralCode, newUserId, newUserRole) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (!referralCode) {
      return { success: false, message: 'No referral code provided' };
    }
    
    // Find the referrer based on the referral code
    const referrerInfo = await ReferralInfo.findOne({
      where: {
        [sequelize.Op.or]: [
          { farmerReferralCode: referralCode },
          { customerReferralCode: referralCode }
        ]
      },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'role']
      }]
    }, { transaction });
    
    if (!referrerInfo) {
      await transaction.rollback();
      return { success: false, message: 'Invalid referral code' };
    }
    
    const referrerId = referrerInfo.userId;
    const referrerRole = referrerInfo.User.role;
    
    // Determine referral type based on roles
    let referralType;
    if (referrerRole === 'farmer' && newUserRole === 'farmer') {
      referralType = 'farmer_to_farmer';
    } else if (referrerRole === 'farmer' && newUserRole === 'consumer') {
      referralType = 'farmer_to_customer';
    } else if (referrerRole === 'consumer' && newUserRole === 'farmer') {
      referralType = 'customer_to_farmer';
    } else if (referrerRole === 'consumer' && newUserRole === 'consumer') {
      referralType = 'customer_to_customer';
    } else {
      await transaction.rollback();
      return { success: false, message: 'Invalid user role combination' };
    }
    
    // Create or get referral info for the new user
    let newUserReferralInfo = await ReferralInfo.findOne({
      where: { userId: newUserId }
    }, { transaction });
    
    if (!newUserReferralInfo) {
      // Generate unique codes for the new user
      const farmerCode = await generateUniqueReferralCode('FF');
      const customerCode = await generateUniqueReferralCode('FC');
      
      newUserReferralInfo = await ReferralInfo.create({
        userId: newUserId,
        referredBy: referrerId,
        referralType,
        referralStatus: 'active',
        farmerReferralCode: farmerCode,
        customerReferralCode: customerCode
      }, { transaction });
    } else if (newUserReferralInfo.referredBy) {
      // User already has a referrer
      await transaction.rollback();
      return { success: false, message: 'User already referred by someone else' };
    } else {
      // Update existing referral info with referrer
      await newUserReferralInfo.update({
        referredBy: referrerId,
        referralType
      }, { transaction });
    }
    
    // Create referral history record
    await ReferralHistory.create({
      referrerId,
      referredId: newUserId,
      referralCode,
      referralType,
      status: 'pending'
    }, { transaction });
    
    // Apply rewards based on referral type
    // For farmer referrals, cashback is applied after first sale via different process
    // For consumer referrals, free deliveries are applied immediately
    
    if (newUserRole === 'consumer') {
      // Check if user already has maximum lifetime free deliveries
      if (newUserReferralInfo.totalFreeDeliveries >= REFERRAL_CONSTANTS.MAX_LIFETIME_FREE_DELIVERIES) {
        // Still record the referral but don't give additional free deliveries
        await newUserReferralInfo.update({
          referralStatus: 'completed'
        }, { transaction });
      } else {
        // Calculate free deliveries to give (respecting the maximum)
        const remainingAllowance = REFERRAL_CONSTANTS.MAX_LIFETIME_FREE_DELIVERIES - newUserReferralInfo.totalFreeDeliveries;
        const freeDeliveriesToAdd = Math.min(REFERRAL_CONSTANTS.FREE_DELIVERIES_PER_REFERRAL, remainingAllowance);
        
        await newUserReferralInfo.update({
          freeDeliveriesRemaining: newUserReferralInfo.freeDeliveriesRemaining + freeDeliveriesToAdd,
          totalFreeDeliveries: newUserReferralInfo.totalFreeDeliveries + freeDeliveriesToAdd,
          referralStatus: 'completed'
        }, { transaction });
      }
      
      // Give the referrer reward if they're a consumer
      if (referrerRole === 'consumer') {
        // Check if referrer has reached maximum free deliveries
        if (referrerInfo.totalFreeDeliveries < REFERRAL_CONSTANTS.MAX_LIFETIME_FREE_DELIVERIES) {
          // Calculate free deliveries to give (respecting the maximum)
          const referrerRemainingAllowance = REFERRAL_CONSTANTS.MAX_LIFETIME_FREE_DELIVERIES - referrerInfo.totalFreeDeliveries;
          const referrerFreeDeliveriesToAdd = Math.min(REFERRAL_CONSTANTS.FREE_DELIVERIES_PER_REFERRAL, referrerRemainingAllowance);
          
          await referrerInfo.update({
            freeDeliveriesRemaining: referrerInfo.freeDeliveriesRemaining + referrerFreeDeliveriesToAdd,
            totalFreeDeliveries: referrerInfo.totalFreeDeliveries + referrerFreeDeliveriesToAdd
          }, { transaction });
        }
      }
    }
    
    await transaction.commit();
    
    logger.info(`Processed referral: ${referralType} for user ${newUserId}`);
    return { 
      success: true, 
      message: 'Referral processed successfully', 
      referralType 
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error processing referral: ${error.message}`);
    throw error;
  }
};

/**
 * Apply farmer cashback after first sale
 * @param {String} farmerId - Farmer user ID
 * @param {Number} orderAmount - Amount of the first sale
 * @returns {Object} Result of applying the cashback
 */
const applyFarmerReferralCashback = async (farmerId) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get farmer's referral info
    const farmerReferralInfo = await ReferralInfo.findOne({
      where: { userId: farmerId }
    }, { transaction });
    
    if (!farmerReferralInfo) {
      await transaction.rollback();
      return { success: false, message: 'Farmer referral information not found' };
    }
    
    // Check if farmer was referred by someone
    if (!farmerReferralInfo.referredBy) {
      await transaction.rollback();
      return { success: false, message: 'Farmer was not referred by anyone' };
    }
    
    // Check if cashback already applied
    if (farmerReferralInfo.referralStatus === 'completed') {
      await transaction.rollback();
      return { success: false, message: 'Referral cashback already applied' };
    }
    
    // Check if farmer has reached maximum lifetime cashback
    if (farmerReferralInfo.totalEarnedCredit >= REFERRAL_CONSTANTS.MAX_LIFETIME_CASHBACK) {
      await transaction.rollback();
      return { success: false, message: 'Farmer has reached maximum lifetime cashback' };
    }
    
    // Calculate the cashback amount (respecting the maximum)
    const remainingAllowance = REFERRAL_CONSTANTS.MAX_LIFETIME_CASHBACK - farmerReferralInfo.totalEarnedCredit;
    const cashbackToAdd = Math.min(REFERRAL_CONSTANTS.CASHBACK_PER_FARMER_REFERRAL, remainingAllowance);
    
    // Apply cashback to the farmer
    await farmerReferralInfo.update({
      remainingCredit: farmerReferralInfo.remainingCredit + cashbackToAdd,
      totalEarnedCredit: farmerReferralInfo.totalEarnedCredit + cashbackToAdd,
      referralStatus: 'completed'
    }, { transaction });
    
    // Get referrer information
    const referrerId = farmerReferralInfo.referredBy;
    const referrerInfo = await ReferralInfo.findOne({
      where: { userId: referrerId },
      include: [{
        model: User,
        as: 'User',
        attributes: ['role']
      }]
    }, { transaction });
    
    // Also apply cashback to the referrer if they are a farmer
    if (referrerInfo && referrerInfo.User.role === 'farmer') {
      // Check if referrer has reached maximum lifetime cashback
      if (referrerInfo.totalEarnedCredit < REFERRAL_CONSTANTS.MAX_LIFETIME_CASHBACK) {
        // Calculate the cashback amount (respecting the maximum)
        const referrerRemainingAllowance = REFERRAL_CONSTANTS.MAX_LIFETIME_CASHBACK - referrerInfo.totalEarnedCredit;
        const referrerCashbackToAdd = Math.min(REFERRAL_CONSTANTS.CASHBACK_PER_FARMER_REFERRAL, referrerRemainingAllowance);
        
        await referrerInfo.update({
          remainingCredit: referrerInfo.remainingCredit + referrerCashbackToAdd,
          totalEarnedCredit: referrerInfo.totalEarnedCredit + referrerCashbackToAdd
        }, { transaction });
      }
    }
    
    // Update referral history
    const referralHistory = await ReferralHistory.findOne({
      where: {
        referredId: farmerId,
        referrerId
      }
    }, { transaction });
    
    if (referralHistory) {
      await referralHistory.update({
        status: 'completed',
        referredRewardType: 'cashback',
        referredRewardAmount: cashbackToAdd
      }, { transaction });
    }
    
    await transaction.commit();
    
    logger.info(`Applied farmer referral cashback $${cashbackToAdd} to ${farmerId}`);
    return { 
      success: true, 
      message: `Cashback of $${cashbackToAdd} applied successfully`, 
      cashbackAmount: cashbackToAdd 
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error applying farmer cashback: ${error.message}`);
    throw error;
  }
};

/**
 * Check and apply free delivery for an order
 * @param {Object} order - Order object
 * @param {String} userId - Customer user ID
 * @returns {Object} Free delivery status
 */
const applyFreeDeliveryIfAvailable = async (order, userId) => {
  const transaction = await sequelize.transaction();
  
  try {
    if (!order || !userId) {
      return { success: false, freeDeliveryApplied: false, message: 'Invalid order or user ID' };
    }
    
    // Get customer referral info
    const customerReferralInfo = await ReferralInfo.findOne({
      where: { userId }
    }, { transaction });
    
    if (!customerReferralInfo || customerReferralInfo.freeDeliveriesRemaining <= 0) {
      await transaction.rollback();
      return { 
        success: true, 
        freeDeliveryApplied: false, 
        message: 'No free deliveries available'
      };
    }
    
    // Apply free delivery
    await customerReferralInfo.update({
      freeDeliveriesRemaining: customerReferralInfo.freeDeliveriesRemaining - 1
    }, { transaction });
    
    // Update order with free delivery flag
    // This depends on your order model structure
    if (order.update) {
      await order.update({
        deliveryFee: 0,
        freeDeliveryApplied: true,
        freeDeliverySource: 'referral'
      }, { transaction });
    }
    
    await transaction.commit();
    
    logger.info(`Applied free delivery for user ${userId}, ${customerReferralInfo.freeDeliveriesRemaining} remaining`);
    return { 
      success: true, 
      freeDeliveryApplied: true, 
      message: 'Free delivery applied successfully',
      remaining: customerReferralInfo.freeDeliveriesRemaining 
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error applying free delivery: ${error.message}`);
    throw error;
  }
};

/**
 * Get referral stats for a user
 * @param {String} userId - User ID
 * @returns {Object} Referral statistics
 */
const getReferralStats = async (userId) => {
  try {
    // Get user's referral info
    const referralInfo = await ReferralInfo.findOne({
      where: { userId }
    });
    
    if (!referralInfo) {
      return {
        success: false,
        message: 'Referral information not found'
      };
    }
    
    // Get users this user has referred
    const referrals = await ReferralHistory.findAll({
      where: { referrerId: userId },
      include: [{
        model: User,
        as: 'ReferredUser',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
    
    // Get who referred this user
    const referredBy = await ReferralHistory.findOne({
      where: { referredId: userId },
      include: [{
        model: User,
        as: 'Referrer',
        attributes: ['id', 'firstName', 'lastName', 'email', 'role']
      }]
    });
    
    // Calculate stats
    const farmerReferrals = referrals.filter(r => r.ReferredUser.role === 'farmer').length;
    const customerReferrals = referrals.filter(r => r.ReferredUser.role === 'consumer').length;
    
    return {
      success: true,
      referralInfo: {
        farmerReferralCode: referralInfo.farmerReferralCode,
        customerReferralCode: referralInfo.customerReferralCode,
        remainingCredit: referralInfo.remainingCredit,
        totalEarnedCredit: referralInfo.totalEarnedCredit,
        freeDeliveriesRemaining: referralInfo.freeDeliveriesRemaining,
        totalFreeDeliveries: referralInfo.totalFreeDeliveries,
        referralStatus: referralInfo.referralStatus
      },
      stats: {
        totalReferrals: referrals.length,
        farmerReferrals,
        customerReferrals
      },
      referredUsers: referrals.map(r => ({
        id: r.ReferredUser.id,
        name: `${r.ReferredUser.firstName} ${r.ReferredUser.lastName}`,
        email: r.ReferredUser.email,
        role: r.ReferredUser.role,
        referralDate: r.createdAt,
        rewardType: r.referrerRewardType,
        rewardAmount: r.referrerRewardAmount,
        freeDeliveries: r.referrerFreeDeliveries
      })),
      referredBy: referredBy ? {
        id: referredBy.Referrer.id,
        name: `${referredBy.Referrer.firstName} ${referredBy.Referrer.lastName}`,
        email: referredBy.Referrer.email,
        role: referredBy.Referrer.role,
        referralDate: referredBy.createdAt,
        referralType: referredBy.referralType
      } : null
    };
  } catch (error) {
    logger.error(`Error getting referral stats: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createOrUpdateReferralInfo,
  processReferral,
  applyFarmerReferralCashback,
  applyFreeDeliveryIfAvailable,
  getReferralStats,
  generateUniqueReferralCode,
  REFERRAL_CONSTANTS
};
