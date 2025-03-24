/**
 * Driver Compensation Service
 * 
 * Calculates and processes driver compensation including:
 * - Base hourly pay
 * - Delivery completion bonuses
 * - Mileage compensation
 * - Performance incentives
 * - Special condition surcharges
 */

const { DriverCompensationConfig, DriverEarnings } = require('../models/pricing');
const { User } = require('../models/user');
const { DeliveryBatch, DeliveryOrder } = require('../models/delivery');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const stripeService = require('./stripeService');

class DriverCompensationService {
  /**
   * Get active driver compensation configuration
   * @returns {Object} Active compensation configuration
   */
  async getActiveCompensationConfig() {
    const config = await DriverCompensationConfig.findOne({
      where: {
        isActive: true,
        [Op.or]: [
          { expirationDate: null },
          { expirationDate: { [Op.gt]: new Date() } }
        ]
      },
      order: [['effectiveDate', 'DESC']]
    });
    
    if (!config) {
      throw new Error('No active driver compensation configuration found');
    }
    
    return config;
  }

  /**
   * Calculate earnings for specific driver for a period
   * @param {string} driverId - Driver's ID
   * @param {Date} startDate - Period start date
   * @param {Date} endDate - Period end date
   * @returns {Object} Calculated earnings for the period
   */
  async calculatePeriodEarnings(driverId, startDate, endDate) {
    try {
      // Get compensation configuration
      const config = await this.getActiveCompensationConfig();
      
      // Get driver information
      const driver = await User.findByPk(driverId);
      if (!driver) {
        throw new Error(`Driver with ID ${driverId} not found`);
      }
      
      // Get completed batches in the period
      const batches = await DeliveryBatch.findAll({
        where: {
          driverId,
          status: 'completed',
          completedAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        }
      });
      
      // Calculate total hours worked (sum of actual duration converted to hours)
      const totalMinutes = batches.reduce(
        (sum, batch) => sum + (batch.actualDuration || 0), 
        0
      );
      const hoursWorked = parseFloat((totalMinutes / 60).toFixed(2));
      
      // Calculate total deliveries completed
      const deliveriesCompleted = batches.reduce(
        (sum, batch) => sum + batch.deliveryCount, 
        0
      );
      
      // Calculate total distance driven
      const distanceDriven = batches.reduce(
        (sum, batch) => sum + (batch.totalDistance || 0), 
        0
      );
      
      // Get average customer rating for the period
      // This would typically come from a ratings table, simplified for this example
      const averageRating = 4.9; // Example rating
      
      // Determine special conditions (simplified for this example)
      const specialConditions = {
        isRemoteArea: false,
        isDifficultAccess: false,
        isWeekendHoliday: false,
        isAfterHours: false
      };
      
      // For batches completed on weekends or holidays
      const weekendHolidayBatches = batches.filter(batch => {
        const completedDate = new Date(batch.completedAt);
        const day = completedDate.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
      });
      
      if (weekendHolidayBatches.length > 0) {
        specialConditions.isWeekendHoliday = true;
      }
      
      // After hours check (simplified)
      const afterHoursBatches = batches.filter(batch => {
        const completedDate = new Date(batch.completedAt);
        const hour = completedDate.getHours();
        return hour < 8 || hour >= 20; // Before 8am or after 8pm
      });
      
      if (afterHoursBatches.length > 0) {
        specialConditions.isAfterHours = true;
      }
      
      // Calculate each component of pay
      const baseHourlyPay = this.calculateHourlyPay(hoursWorked, config);
      const deliveryBonusAmount = this.calculateDeliveryBonus(deliveriesCompleted, config);
      const mileageAmount = this.calculateMileageCompensation(distanceDriven, config);
      const efficiencyBonusAmount = this.calculateEfficiencyBonus(deliveriesCompleted, hoursWorked, config);
      const batchBonusAmount = this.calculateBatchBonus(batches, config);
      const satisfactionBonusAmount = this.calculateSatisfactionBonus(averageRating, config);
      const retentionBonusAmount = this.calculateRetentionBonus(driver.createdAt, endDate, config);
      const specialConditionAmount = this.calculateSpecialConditions(specialConditions, config);
      
      // Calculate total earnings
      const totalEarnings = parseFloat((
        baseHourlyPay +
        deliveryBonusAmount +
        mileageAmount +
        efficiencyBonusAmount +
        batchBonusAmount +
        satisfactionBonusAmount +
        retentionBonusAmount +
        specialConditionAmount
      ).toFixed(2));
      
      // Create earnings object
      const earnings = {
        driverId,
        payPeriodStart: startDate,
        payPeriodEnd: endDate,
        hoursWorked,
        baseHourlyPay,
        deliveriesCompleted,
        deliveryBonusAmount,
        distanceDriven,
        mileageAmount,
        efficiencyBonusAmount,
        batchBonusAmount,
        satisfactionBonusAmount,
        retentionBonusAmount,
        specialConditionAmount,
        totalEarnings,
        isPaid: false
      };
      
      return earnings;
    } catch (error) {
      logger.error(`Error calculating earnings for driver ${driverId}:`, error);
      throw new Error('Failed to calculate driver earnings');
    }
  }

  /**
   * Estimate delivery earnings for a potential delivery
   * 
   * This allows drivers to see potential earnings before accepting an order
   * 
   * @param {string} orderId - Order ID (optional, for order details)
   * @param {string} driverId - Driver ID
   * @param {number} estimatedDistanceKm - Estimated delivery distance in km
   * @param {number} estimatedTimeMinutes - Estimated delivery time in minutes
   * @param {Object} deliveryDetails - Additional delivery details
   * @returns {Object} Estimated earnings breakdown
   */
  async estimateDeliveryEarnings(orderId, driverId, estimatedDistanceKm, estimatedTimeMinutes, deliveryDetails = {}) {
    try {
      // Get active compensation configuration
      const config = await this.getActiveCompensationConfig();
      
      // Convert estimated time to hours for hourly pay calculation
      const estimatedTimeHours = estimatedTimeMinutes / 60;
      
      // Calculate base hourly pay
      const baseHourlyPay = parseFloat(config.baseHourlyRate) * estimatedTimeHours;
      
      // Calculate delivery completion bonus
      const deliveryBonus = parseFloat(config.deliveryCompletionBonus);
      
      // Calculate mileage compensation
      const mileageAmount = parseFloat(config.mileageCompensation) * estimatedDistanceKm;
      
      // Calculate special condition surcharges
      let specialConditionAmount = 0;
      
      // Weekend or holiday surcharge
      if (deliveryDetails.isWeekendOrHoliday) {
        specialConditionAmount += parseFloat(config.weekendHolidaySurcharge);
      }
      
      // After hours surcharge
      if (deliveryDetails.isAfterHours) {
        specialConditionAmount += parseFloat(config.afterHoursSurcharge);
      }
      
      // Remote area surcharge
      if (deliveryDetails.isRemoteArea) {
        specialConditionAmount += parseFloat(config.remoteAreaSurcharge);
      }
      
      // Difficult access surcharge
      if (deliveryDetails.isDifficultAccess) {
        specialConditionAmount += parseFloat(config.difficultAccessSurcharge);
      }
      
      // Calculate potential earnings for this delivery
      const totalEstimatedEarnings = 
        baseHourlyPay + 
        deliveryBonus + 
        mileageAmount + 
        specialConditionAmount;
      
      // Return detailed breakdown
      return {
        estimatedEarnings: parseFloat(totalEstimatedEarnings.toFixed(2)),
        breakdown: {
          baseHourlyPay: parseFloat(baseHourlyPay.toFixed(2)),
          deliveryBonus: parseFloat(deliveryBonus.toFixed(2)),
          mileageAmount: parseFloat(mileageAmount.toFixed(2)),
          specialConditionAmount: parseFloat(specialConditionAmount.toFixed(2)),
          estimatedTime: {
            minutes: estimatedTimeMinutes,
            hours: estimatedTimeHours
          },
          estimatedDistance: estimatedDistanceKm
        },
        orderId,
        driverId,
        configId: config.id,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Error estimating delivery earnings: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process payments for driver earnings via Stripe
   * 
   * @param {Array} earningsRecords - Array of driver earnings records to process
   * @returns {Object} Payment processing results
   */
  async processDriverPayments(earningsRecords) {
    try {
      // Process payments using Stripe service
      return await stripeService.processDriverPayments(earningsRecords);
    } catch (error) {
      logger.error(`Error processing driver payments: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process payment for a single driver's earnings record
   * 
   * @param {string} earningsId - ID of the earnings record
   * @param {string} paymentReference - Reference for the payment
   * @returns {Object} Processed earnings record
   */
  async processDriverPayment(earningsId, paymentReference) {
    try {
      // Find earnings record
      const earnings = await DriverEarnings.findByPk(earningsId);
      
      if (!earnings) {
        throw new Error(`Earnings record not found: ${earningsId}`);
      }
      
      if (earnings.isPaid) {
        throw new Error(`Earnings record already paid: ${earningsId}`);
      }
      
      // Process single payment using Stripe
      const driver = await User.findByPk(earnings.driverId, {
        attributes: ['id', 'email', 'firstName', 'lastName', 'stripeAccountId']
      });
      
      if (!driver) {
        throw new Error(`Driver not found: ${earnings.driverId}`);
      }
      
      if (!driver.stripeAccountId) {
        throw new Error(`Driver has no Stripe account: ${earnings.driverId}`);
      }
      
      // Manually process payment
      if (paymentReference === 'manual') {
        // Update earnings as paid with manual reference
        await earnings.update({
          isPaid: true,
          paymentDate: new Date(),
          paymentReference: `MANUAL-${new Date().toISOString().slice(0, 10)}`
        });
        
        return earnings;
      }
      
      // Process through Stripe
      try {
        // Amount in cents
        const amount = Math.round(earnings.totalEarnings * 100);
        
        // Create a transfer to the driver's connected account
        const transfer = await stripeService.stripe.transfers.create({
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
        });
        
        return earnings;
      } catch (error) {
        logger.error(`Error processing payment through Stripe: ${error.message}`);
        throw error;
      }
    } catch (error) {
      logger.error(`Error processing driver payment: ${error.message}`);
      throw error;
    }
  }

  // ... other methods ...

  /**
   * Calculate hourly pay for a driver shift
   * @param {number} hoursWorked - Number of hours worked
   * @param {Object} config - Compensation configuration
   * @returns {number} Hourly pay amount
   */
  calculateHourlyPay(hoursWorked, config) {
    return parseFloat((hoursWorked * config.baseHourlyRate).toFixed(2));
  }

  // ... other methods ...
}

module.exports = new DriverCompensationService();
