/**
 * Pricing Service
 * 
 * Handles all pricing logic for the FreshFarmily platform including:
 * - Customer charge calculation
 * - Fee cap enforcement
 * - Revenue distribution
 * - Membership benefits
 */

const { PricingConfiguration, OrderCharge, Membership } = require('../models/pricing');
const logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const { User } = require('../models/user');

class PricingService {
  /**
   * Get the active pricing configuration
   * @returns {Promise<Object>} Active pricing configuration
   */
  async getActivePricingConfig() {
    try {
      const config = await PricingConfiguration.findOne({
        where: {
          isActive: true,
          effectiveDate: { [sequelize.Op.lte]: new Date() },
          [sequelize.Op.or]: [
            { expirationDate: null },
            { expirationDate: { [sequelize.Op.gt]: new Date() } }
          ]
        },
        order: [['effectiveDate', 'DESC']]
      });

      if (!config) {
        logger.warn('No active pricing configuration found, using default values');
        return await this.createDefaultPricingConfig();
      }

      return config;
    } catch (error) {
      logger.error('Error getting active pricing config:', error);
      throw new Error('Failed to retrieve pricing configuration');
    }
  }

  /**
   * Create default pricing configuration if none exists
   * @returns {Promise<Object>} Created default configuration
   */
  async createDefaultPricingConfig() {
    try {
      return await PricingConfiguration.create({
        name: 'Default Configuration',
        isActive: true,
        // Default values are already defined in the model
      });
    } catch (error) {
      logger.error('Error creating default pricing config:', error);
      throw new Error('Failed to create default pricing configuration');
    }
  }

  /**
   * Check if user has an active membership
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if user has active membership
   */
  async hasActiveMembership(userId) {
    try {
      const membership = await Membership.findOne({
        where: {
          userId,
          isActive: true,
          renewalDate: { [sequelize.Op.gt]: new Date() }
        }
      });
      
      return !!membership;
    } catch (error) {
      logger.error(`Error checking membership for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Determine location type based on delivery address
   * @param {Object} deliveryAddress - Delivery address object
   * @returns {string} Location type: 'urban', 'suburban', or 'rural'
   */
  determineLocationType(deliveryAddress) {
    // This is a simplified implementation
    // In production, this would use postal codes, population density data,
    // or other geographic information to accurately determine location type
    
    // For demo purposes, using a simple keyword-based approach
    const address = `${deliveryAddress.street} ${deliveryAddress.city} ${deliveryAddress.state} ${deliveryAddress.postalCode}`.toLowerCase();
    
    // Check for rural indicators
    if (
      address.includes('rural') || 
      address.includes('county road') || 
      address.includes('township') ||
      address.includes('range road')
    ) {
      return 'rural';
    }
    
    // Check for suburban indicators
    if (
      address.includes('suburb') || 
      address.includes('heights') || 
      address.includes('hills') ||
      address.includes('village') ||
      address.includes('estates')
    ) {
      return 'suburban';
    }
    
    // Default to urban
    return 'urban';
  }

  /**
   * Calculate order size discount based on order subtotal
   * @param {number} subtotal - Order subtotal
   * @param {Object} pricingConfig - Pricing configuration
   * @returns {number} Discount amount (negative value)
   */
  calculateOrderSizeDiscount(subtotal, pricingConfig) {
    if (subtotal >= 100) {
      return pricingConfig.largeOrderDiscount;
    } else if (subtotal >= 60) {
      return pricingConfig.mediumOrderDiscount;
    } else if (subtotal >= 35) {
      return pricingConfig.smallOrderDiscount;
    }
    return 0;
  }

  /**
   * Calculate distance surcharge based on delivery distance
   * @param {number} distance - Delivery distance in kilometers
   * @param {Object} pricingConfig - Pricing configuration
   * @returns {number} Surcharge amount
   */
  calculateDistanceSurcharge(distance, pricingConfig) {
    if (distance >= pricingConfig.distanceSurchargeThreshold3) {
      return pricingConfig.distanceSurcharge3;
    } else if (distance >= pricingConfig.distanceSurchargeThreshold2) {
      return pricingConfig.distanceSurcharge2;
    } else if (distance >= pricingConfig.distanceSurchargeThreshold1) {
      return pricingConfig.distanceSurcharge1;
    }
    return 0;
  }

  /**
   * Calculate all charges for an order
   * @param {Object} order - Order details
   * @param {string} userId - User ID
   * @param {Object} deliveryDetails - Delivery information
   * @returns {Promise<Object>} Calculated order charges
   */
  async calculateOrderCharges(order, userId, deliveryDetails) {
    try {
      const pricingConfig = await this.getActivePricingConfig();
      const hasMembership = await this.hasActiveMembership(userId);
      const locationType = this.determineLocationType(deliveryDetails.address);
      
      // Extract values from configuration based on location type
      let deliveryPercentage, minimumDeliveryFee;
      
      switch (locationType) {
        case 'suburban':
          deliveryPercentage = pricingConfig.suburbanDeliveryPercentage;
          minimumDeliveryFee = pricingConfig.suburbanMinimumFee;
          break;
        case 'rural':
          deliveryPercentage = pricingConfig.ruralDeliveryPercentage;
          minimumDeliveryFee = pricingConfig.ruralMinimumFee;
          break;
        default: // urban
          deliveryPercentage = pricingConfig.urbanDeliveryPercentage;
          minimumDeliveryFee = pricingConfig.urbanMinimumFee;
          break;
      }
      
      // Calculate base charges
      const productSubtotal = parseFloat(order.subtotal);
      const platformCommission = parseFloat((productSubtotal * pricingConfig.platformCommissionRate).toFixed(2));
      const farmerServicesFee = parseFloat((productSubtotal * pricingConfig.farmerServicesRate).toFixed(2));
      
      // Calculate payment processing fee
      const paymentProcessingFee = parseFloat(
        (productSubtotal * pricingConfig.paymentProcessingPercentage + pricingConfig.paymentProcessingFlatFee).toFixed(2)
      );
      
      // Calculate delivery service fee (percentage with minimum)
      const calculatedDeliveryServiceFee = parseFloat((productSubtotal * deliveryPercentage).toFixed(2));
      const deliveryServiceFee = Math.max(calculatedDeliveryServiceFee, minimumDeliveryFee);
      
      // Fixed insurance fee
      const insuranceFee = pricingConfig.supplyChainInsuranceFee;
      
      // Calculate delivery fee
      const baseDeliveryFee = pricingConfig.baseDeliveryFee;
      const distanceSurcharge = this.calculateDistanceSurcharge(deliveryDetails.distance, pricingConfig);
      const orderSizeDiscount = this.calculateOrderSizeDiscount(productSubtotal, pricingConfig);
      
      // Calculate membership benefits
      let membershipDiscount = 0;
      
      if (hasMembership) {
        // Product discount (4%)
        membershipDiscount += parseFloat((productSubtotal * pricingConfig.memberProductDiscount).toFixed(2));
        
        // Delivery fee discount (50%)
        const deliveryFeeBeforeDiscount = baseDeliveryFee + distanceSurcharge + orderSizeDiscount;
        // If order exceeds free delivery threshold, waive delivery fee entirely
        if (productSubtotal >= pricingConfig.memberFreeDeliveryThreshold) {
          membershipDiscount += deliveryFeeBeforeDiscount;
        } else {
          // Otherwise apply 50% discount
          membershipDiscount += parseFloat((deliveryFeeBeforeDiscount * pricingConfig.memberDeliveryDiscount).toFixed(2));
        }
      }
      
      // Calculate base totals before fee cap
      const deliveryFeeBeforeCap = Math.max(0, baseDeliveryFee + distanceSurcharge + orderSizeDiscount - (hasMembership ? membershipDiscount : 0));
      const platformFeesBeforeCap = platformCommission + farmerServicesFee + paymentProcessingFee + deliveryServiceFee + insuranceFee;
      const subtotalBeforeTaxAndCap = productSubtotal + deliveryFeeBeforeCap + platformFeesBeforeCap;
      
      // Calculate if fee cap needs to be applied
      const feeCap = hasMembership ? pricingConfig.memberFeeCap : pricingConfig.nonMemberFeeCap;
      const maxAllowableFees = parseFloat((productSubtotal * feeCap).toFixed(2));
      const actualFees = deliveryFeeBeforeCap + platformFeesBeforeCap;
      
      // Apply fee cap discount if needed
      let feeCapDiscount = 0;
      if (actualFees > maxAllowableFees) {
        feeCapDiscount = parseFloat((actualFees - maxAllowableFees).toFixed(2));
      }
      
      // Apply fee cap discount according to priority:
      // 1. Delivery fee reduction (up to 50%)
      // 2. Service fee reduction (up to 40%)
      // 3. Platform commission reduction (last resort)
      let remainingDiscount = feeCapDiscount;
      let deliveryFeeReduction = 0;
      let serviceFeeReduction = 0;
      let platformFeeReduction = 0;
      
      // Step 1: Reduce delivery fee by up to 50%
      const maxDeliveryFeeReduction = deliveryFeeBeforeCap * 0.5;
      if (remainingDiscount > 0) {
        deliveryFeeReduction = Math.min(maxDeliveryFeeReduction, remainingDiscount);
        remainingDiscount -= deliveryFeeReduction;
      }
      
      // Step 2: Reduce service fee by up to 40%
      const maxServiceFeeReduction = deliveryServiceFee * 0.4;
      if (remainingDiscount > 0) {
        serviceFeeReduction = Math.min(maxServiceFeeReduction, remainingDiscount);
        remainingDiscount -= serviceFeeReduction;
      }
      
      // Step 3: Reduce platform commission as last resort
      if (remainingDiscount > 0) {
        platformFeeReduction = remainingDiscount;
      }
      
      // Apply reductions
      const finalDeliveryFee = parseFloat((deliveryFeeBeforeCap - deliveryFeeReduction).toFixed(2));
      const finalServiceFee = parseFloat((deliveryServiceFee - serviceFeeReduction).toFixed(2));
      const finalPlatformCommission = parseFloat((platformCommission - platformFeeReduction).toFixed(2));
      
      // Calculate final subtotal before tax
      const subtotalBeforeTax = parseFloat((
        productSubtotal + 
        finalDeliveryFee + 
        finalPlatformCommission + 
        farmerServicesFee + 
        paymentProcessingFee + 
        finalServiceFee + 
        insuranceFee
      ).toFixed(2));
      
      // Calculate tax (simplified example - would need actual tax calculation logic)
      const taxRate = 0.05; // Example 5% tax rate
      const taxAmount = parseFloat((subtotalBeforeTax * taxRate).toFixed(2));
      
      // Final total
      const finalTotal = parseFloat((subtotalBeforeTax + taxAmount).toFixed(2));
      
      // For customer presentation (simplified format)
      const customerPlatformFee = parseFloat((
        finalPlatformCommission + 
        farmerServicesFee + 
        finalServiceFee + 
        insuranceFee
      ).toFixed(2));
      
      const customerDeliveryFee = finalDeliveryFee;
      
      // Revenue distribution
      const farmerRevenue = parseFloat((productSubtotal * 0.9).toFixed(2));
      const driverRevenue = parseFloat((finalDeliveryFee * 0.85).toFixed(2));
      const platformRevenue = parseFloat((finalTotal - farmerRevenue - driverRevenue - taxAmount).toFixed(2));
      
      // Create order charge object
      const orderCharge = {
        orderId: order.id,
        pricingConfigId: pricingConfig.id,
        productSubtotal,
        platformCommission: finalPlatformCommission,
        farmerServicesFee,
        paymentProcessingFee,
        deliveryServiceFee: finalServiceFee,
        insuranceFee,
        baseDeliveryFee,
        distanceSurcharge,
        orderSizeDiscount,
        membershipDiscount,
        feeCapDiscount,
        subtotalBeforeTax,
        taxAmount,
        finalTotal,
        customerPlatformFee,
        customerDeliveryFee,
        farmerRevenue,
        driverRevenue,
        platformRevenue
      };
      
      return orderCharge;
    } catch (error) {
      logger.error('Error calculating order charges:', error);
      throw new Error('Failed to calculate order charges');
    }
  }

  /**
   * Save order charges to database
   * @param {Object} charges - Calculated order charges
   * @returns {Promise<Object>} Saved order charge record
   */
  async saveOrderCharges(charges) {
    try {
      return await OrderCharge.create(charges);
    } catch (error) {
      logger.error('Error saving order charges:', error);
      throw new Error('Failed to save order charges');
    }
  }

  /**
   * Get customer-facing order summary
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Customer-facing order summary
   */
  async getCustomerOrderSummary(orderId) {
    try {
      const orderCharge = await OrderCharge.findOne({
        where: { orderId }
      });
      
      if (!orderCharge) {
        throw new Error('Order charges not found');
      }
      
      // Format for customer display (simplified view as requested)
      return {
        orderId: orderCharge.orderId,
        productSubtotal: orderCharge.productSubtotal,
        deliveryFee: orderCharge.customerDeliveryFee,
        platformServiceCharge: orderCharge.customerPlatformFee,
        paymentProcessingFee: orderCharge.paymentProcessingFee,
        taxAmount: orderCharge.taxAmount,
        total: orderCharge.finalTotal
      };
    } catch (error) {
      logger.error(`Error getting customer order summary for order ${orderId}:`, error);
      throw new Error('Failed to get order summary');
    }
  }
  
  /**
   * Get detailed order charges (for admin/backend view)
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Detailed order charges
   */
  async getDetailedOrderCharges(orderId) {
    try {
      return await OrderCharge.findOne({
        where: { orderId }
      });
    } catch (error) {
      logger.error(`Error getting detailed order charges for order ${orderId}:`, error);
      throw new Error('Failed to get detailed order charges');
    }
  }
}

module.exports = new PricingService();
