/**
 * Referral Routes
 * 
 * Defines all referral program-related API routes for the FreshFarmily system
 */

const express = require('express');
const { body, validationResult, param, query } = require('express-validator');
const { authenticate, requireActiveUser, requirePermissions } = require('../middleware/auth');
const referralController = require('../controllers/referralController');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @route POST /api/referrals/apply
 * @description Apply a referral code when registering
 * @access Public
 */
router.post('/apply', [
  body('code').notEmpty().withMessage('Referral code is required'),
  body('userId').isUUID().withMessage('Valid user ID is required'),
  body('userRole').isIn(['farmer', 'consumer']).withMessage('Valid user role is required')
], referralController.applyReferralCode);

/**
 * @route GET /api/referrals/my-referrals
 * @description Get user's referral information and stats
 * @access Private
 */
router.get('/my-referrals', [
  authenticate,
  requireActiveUser
], referralController.getReferralInfo);

/**
 * @route GET /api/referrals/history
 * @description Get user's referral history
 * @access Private
 */
router.get('/history', [
  authenticate,
  requireActiveUser
], referralController.getReferralHistory);

/**
 * @route GET /api/referrals/free-deliveries
 * @description Check if user has free deliveries available
 * @access Private
 */
router.get('/free-deliveries', [
  authenticate,
  requireActiveUser
], referralController.checkFreeDeliveries);

/**
 * @route POST /api/referrals/generate-code
 * @description Generate a referral code for a user
 * @access Private
 */
router.post('/generate-code', [
  authenticate,
  requireActiveUser
], referralController.generateReferralCode);

/**
 * @route GET /api/referrals/info
 * @description Get just the user's referral codes and status
 * @access Private
 */
router.get('/info', [
  authenticate,
  requireActiveUser
], referralController.getReferralCodes);

/**
 * @route POST /api/referrals/apply-farmer-cashback
 * @description Apply farmer referral cashback after first sale (admin only)
 * @access Private (admin only)
 */
router.post('/apply-farmer-cashback', [
  authenticate,
  requireActiveUser,
  requirePermissions(['admin']),
  body('farmerId').isUUID().withMessage('Valid farmer ID is required')
], referralController.applyFarmerReferralCashback);

/**
 * @route POST /api/referrals/validate
 * @description Validate a referral code
 * @access Public
 */
router.post('/validate', [
  body('code').notEmpty().withMessage('Referral code is required')
], referralController.validateReferralCode);

module.exports = router;
