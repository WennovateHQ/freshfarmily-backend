/**
 * Stripe Payment Service
 * 
 * Handles all payment processing with Stripe for the FreshFarmily platform
 * including commission calculation, payment processing, and payouts to farmers
 */

const Stripe = require('stripe');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
require('dotenv').config();

// Initialize Stripe with API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// FreshFarmily platform commission rate (5%)
const PLATFORM_COMMISSION_RATE = 0.05;

// Tax rates by province
const TAX_RATES = {
  'AB': { gst: 0.05, pst: 0.00 }, // Alberta: 5% GST
  'BC': { gst: 0.05, pst: 0.07 }, // British Columbia: 5% GST + 7% PST
  'MB': { gst: 0.05, pst: 0.07 }, // Manitoba: 5% GST + 7% PST
  'NB': { gst: 0.05, pst: 0.10 }, // New Brunswick: 15% HST (5% GST component + 10% provincial component)
  'NL': { gst: 0.05, pst: 0.10 }, // Newfoundland and Labrador: 15% HST (5% GST component + 10% provincial component)
  'NS': { gst: 0.05, pst: 0.10 }, // Nova Scotia: 15% HST (5% GST component + 10% provincial component)
  'NT': { gst: 0.05, pst: 0.00 }, // Northwest Territories: 5% GST
  'NU': { gst: 0.05, pst: 0.00 }, // Nunavut: 5% GST
  'ON': { gst: 0.05, pst: 0.08 }, // Ontario: 13% HST (5% GST component + 8% provincial component)
  'PE': { gst: 0.05, pst: 0.10 }, // Prince Edward Island: 15% HST (5% GST component + 10% provincial component)
  'QC': { gst: 0.05, pst: 0.09975 }, // Quebec: 5% GST + 9.975% QST
  'SK': { gst: 0.05, pst: 0.06 }, // Saskatchewan: 5% GST + 6% PST
  'YT': { gst: 0.05, pst: 0.00 }  // Yukon: 5% GST
};

/**
 * Create a payment intent for an order
 * @param {Object} order - Order object with total amount and items
 * @param {Object} paymentDetails - Payment method details
 * @returns {Object} Stripe payment intent
 */
const createPaymentIntent = async (order, paymentDetails) => {
  try {
    logger.info(`Creating payment intent for order ${order.orderNumber}`);
    
    // Calculate order amount in cents (Stripe uses smallest currency unit)
    const amount = Math.round(order.totalAmount * 100);
    
    // Create a payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'cad',
      description: `FreshFarmily Order: ${order.orderNumber}`,
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        customerId: order.userId
      },
      receipt_email: paymentDetails.email,
      payment_method_types: ['card'],
      payment_method: paymentDetails.paymentMethodId,
      confirm: true
    });
    
    logger.info(`Payment intent created: ${paymentIntent.id} for order ${order.orderNumber}`);
    return paymentIntent;
  } catch (error) {
    logger.error(`Error creating payment intent: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate taxes for a product based on province
 * @param {Number} amount - Product amount
 * @param {String} province - Canadian province code (e.g., 'ON', 'BC')
 * @returns {Object} Tax breakdown with GST, PST, and total tax
 */
const calculateTaxes = (amount, province) => {
  // Default to Ontario if province is not found
  const taxRate = TAX_RATES[province] || TAX_RATES['ON'];
  
  const gstAmount = amount * taxRate.gst;
  const pstAmount = amount * taxRate.pst;
  const totalTax = gstAmount + pstAmount;
  
  return {
    gstAmount: parseFloat(gstAmount.toFixed(2)),
    pstAmount: parseFloat(pstAmount.toFixed(2)),
    totalTaxAmount: parseFloat(totalTax.toFixed(2))
  };
};

/**
 * Process order payment including commission calculations
 * @param {Object} order - The order object with items
 * @param {Array} orderItems - The order items with product and farm details
 * @returns {Object} Payment processing results
 */
const processOrderPayment = async (order, orderItems) => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info(`Processing payment for order ${order.orderNumber}`);
    
    // Group order items by farmer
    const farmerPayments = {};
    let platformFee = 0;
    
    // Calculate amounts per farmer
    for (const item of orderItems) {
      const { farmId, farmName, quantity, price, subtotal } = item;
      
      if (!farmerPayments[farmId]) {
        farmerPayments[farmId] = {
          farmId,
          farmName,
          amount: 0,
          commission: 0,
          items: []
        };
      }
      
      // Calculate platform commission for this item
      const itemCommission = subtotal * PLATFORM_COMMISSION_RATE;
      const farmerAmount = subtotal - itemCommission;
      
      // Update farmer payment record
      farmerPayments[farmId].amount += farmerAmount;
      farmerPayments[farmId].commission += itemCommission;
      farmerPayments[farmId].items.push({
        productId: item.productId,
        productName: item.productName,
        quantity,
        price,
        subtotal,
        commission: itemCommission
      });
      
      // Track total platform fee
      platformFee += itemCommission;
    }
    
    // Save payment records in the database
    const { FarmerPayment } = require('../models/payment');
    
    // Create farmer payment records
    const paymentRecords = [];
    for (const farmerId in farmerPayments) {
      const payment = await FarmerPayment.create({
        orderId: order.id,
        farmerId,
        farmName: farmerPayments[farmerId].farmName,
        amount: farmerPayments[farmerId].amount,
        commission: farmerPayments[farmerId].commission,
        isPaid: false,
        paymentDetails: {
          items: farmerPayments[farmerId].items
        }
      }, { transaction });
      
      paymentRecords.push(payment);
    }
    
    await transaction.commit();
    
    logger.info(`Payment processed for order ${order.orderNumber}, platform fee: $${platformFee.toFixed(2)}`);
    
    return {
      success: true,
      platformFee,
      farmerPayments: paymentRecords
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error processing payment: ${error.message}`);
    throw error;
  }
};

/**
 * Process weekly payouts to farmers
 * @returns {Object} Results of the payout process
 */
const processWeeklyPayouts = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('Processing weekly farmer payouts');
    
    const { FarmerPayment, FarmerPayout } = require('../models/payment');
    
    // Get all unpaid farmer payments grouped by farmer
    const unpaidPayments = await FarmerPayment.findAll({
      where: {
        isPaid: false
      },
      order: [['createdAt', 'ASC']]
    }, { transaction });
    
    // Group by farmer
    const paymentsByFarmer = {};
    for (const payment of unpaidPayments) {
      if (!paymentsByFarmer[payment.farmerId]) {
        paymentsByFarmer[payment.farmerId] = {
          farmerId: payment.farmerId,
          farmName: payment.farmName,
          payments: [],
          totalAmount: 0
        };
      }
      
      paymentsByFarmer[payment.farmerId].payments.push(payment);
      paymentsByFarmer[payment.farmerId].totalAmount += parseFloat(payment.amount);
    }
    
    // Process payout for each farmer
    const payouts = [];
    for (const farmerId in paymentsByFarmer) {
      const farmerData = paymentsByFarmer[farmerId];
      
      // Apply referral program credits if available
      const { User } = require('../models/user');
      const farmer = await User.findByPk(farmerId, {
        include: ['ReferralInfo']
      }, { transaction });
      
      let remainingCredit = 0;
      if (farmer.ReferralInfo && farmer.ReferralInfo.remainingCredit > 0) {
        remainingCredit = farmer.ReferralInfo.remainingCredit;
      }
      
      // Calculate how much of the credit to apply
      const commissionTotal = farmerData.payments.reduce(
        (sum, payment) => sum + parseFloat(payment.commission), 0
      );
      
      let appliedCredit = 0;
      if (remainingCredit > 0 && commissionTotal > 0) {
        appliedCredit = Math.min(remainingCredit, commissionTotal);
        
        // Update farmer's remaining credit
        if (farmer.ReferralInfo) {
          await farmer.ReferralInfo.update({
            remainingCredit: remainingCredit - appliedCredit
          }, { transaction });
        }
      }
      
      // Create payout record
      const payout = await FarmerPayout.create({
        farmerId,
        farmName: farmerData.farmName,
        amount: farmerData.totalAmount + appliedCredit,
        originalAmount: farmerData.totalAmount,
        creditApplied: appliedCredit,
        status: 'pending',
        paymentMethod: 'bank_transfer',
        paymentReference: `FreshFarmily-${new Date().toISOString().slice(0, 10)}-${farmerId.slice(-6)}`
      }, { transaction });
      
      // Mark all included payments as paid
      for (const payment of farmerData.payments) {
        await payment.update({
          isPaid: true,
          payoutId: payout.id
        }, { transaction });
      }
      
      payouts.push(payout);
    }
    
    await transaction.commit();
    
    logger.info(`Processed ${payouts.length} farmer payouts`);
    return {
      success: true,
      payoutCount: payouts.length,
      payouts
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error processing weekly payouts: ${error.message}`);
    throw error;
  }
};

/**
 * Process driver payments using Stripe
 * @param {Array} driverEarnings - Array of driver earnings records to process payments for
 * @returns {Object} Results of the driver payment process
 */
const processDriverPayments = async (driverEarnings) => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info(`Processing payments for ${driverEarnings.length} drivers`);
    
    const { User } = require('../models/user');
    const processedPayments = [];
    
    for (const earnings of driverEarnings) {
      // Skip already paid earnings
      if (earnings.isPaid) {
        logger.info(`Skipping already paid earnings for driver ${earnings.driverId}`);
        continue;
      }
      
      // Get driver information including payment method
      const driver = await User.findByPk(earnings.driverId, {
        attributes: ['id', 'email', 'firstName', 'lastName', 'stripeAccountId']
      }, { transaction });
      
      if (!driver) {
        logger.error(`Driver not found: ${earnings.driverId}`);
        continue;
      }
      
      if (!driver.stripeAccountId) {
        logger.error(`Driver has no Stripe account: ${earnings.driverId}`);
        continue;
      }
      
      try {
        // Amount in cents
        const amount = Math.round(earnings.totalEarnings * 100);
        
        // Create a transfer to the driver's connected account
        const transfer = await stripe.transfers.create({
          amount,
          currency: 'cad',
          destination: driver.stripeAccountId,
          description: `FreshFarmily Driver Payment: ${earnings.payPeriodStart.toISOString().slice(0, 10)} - ${earnings.payPeriodEnd.toISOString().slice(0, 10)}`,
          metadata: {
            driverId: earnings.driverId,
            earningsId: earnings.id,
            payPeriodStart: earnings.payPeriodStart.toISOString(),
            payPeriodEnd: earnings.payPeriodEnd.toISOString()
          }
        });
        
        // Update earnings record as paid
        await earnings.update({
          isPaid: true,
          paymentDate: new Date(),
          paymentReference: transfer.id
        }, { transaction });
        
        processedPayments.push({
          driverId: earnings.driverId,
          driverName: `${driver.firstName} ${driver.lastName}`,
          amount: earnings.totalEarnings,
          transferId: transfer.id,
          status: 'success'
        });
        
        logger.info(`Successfully processed payment for driver ${earnings.driverId}: ${transfer.id}`);
      } catch (stripeError) {
        logger.error(`Stripe error processing driver payment: ${stripeError.message}`);
        
        processedPayments.push({
          driverId: earnings.driverId,
          driverName: `${driver.firstName} ${driver.lastName}`,
          amount: earnings.totalEarnings,
          status: 'failed',
          error: stripeError.message
        });
      }
    }
    
    await transaction.commit();
    
    return {
      success: true,
      processedCount: processedPayments.length,
      payments: processedPayments
    };
  } catch (error) {
    await transaction.rollback();
    logger.error(`Error processing driver payments: ${error.message}`);
    throw error;
  }
};

/**
 * Create a Stripe Connect account for a driver
 * @param {Object} driver - Driver user object
 * @param {Object} accountDetails - Account details including bank information
 * @returns {Object} Results of the account creation process
 */
const createDriverConnectAccount = async (driver, accountDetails) => {
  try {
    logger.info(`Creating Stripe Connect account for driver ${driver.id}`);
    
    // Create an Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'CA',
      email: driver.email,
      capabilities: {
        transfers: {requested: true},
      },
      business_type: 'individual',
      business_profile: {
        mcc: '4121', // Taxicabs and limousines
        url: 'https://freshfarmily.com',
        product_description: 'Grocery delivery services'
      },
      individual: {
        first_name: driver.firstName,
        last_name: driver.lastName,
        email: driver.email
      },
      metadata: {
        driverId: driver.id
      }
    });
    
    // Create an account link for the user to onboard
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: 'https://freshfarmily.com/driver/onboarding/refresh',
      return_url: 'https://freshfarmily.com/driver/onboarding/complete',
      type: 'account_onboarding',
    });
    
    // Update the driver's record with the Stripe account ID
    await driver.update({
      stripeAccountId: account.id
    });
    
    logger.info(`Created Stripe Connect account for driver ${driver.id}: ${account.id}`);
    
    return {
      success: true,
      accountId: account.id,
      accountLink: accountLink.url
    };
  } catch (error) {
    logger.error(`Error creating Stripe Connect account: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createPaymentIntent,
  calculateTaxes,
  processOrderPayment,
  processWeeklyPayouts,
  processDriverPayments,
  createDriverConnectAccount,
  PLATFORM_COMMISSION_RATE,
  TAX_RATES
};
