/**
 * Cart Routes
 * 
 * Defines the cart API routes for the FreshFarmily application
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { Cart, CartItem } = require('../models/cart');
const { Product } = require('../models/product');
const { sequelize } = require('../config/database');

const router = express.Router();

// Get the current user's cart
router.get('/', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      // Return empty cart for unauthenticated users
      return res.status(200).json({
        id: 'guest-cart',
        items: [],
        totalItems: 0,
        subtotal: 0,
        taxes: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        options: {
          province: 'BC',
          deliveryMethod: 'delivery',
          applyFreeDelivery: false
        }
      });
    }

    // Find user's cart or create new one
    const [cart, created] = await Cart.findOrCreate({
      where: { 
        userId: req.user.id,
        status: 'active'
      },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{
            model: Product,
            attributes: ['id', 'name', 'price', 'unit', 'quantityAvailable', 'isAvailable']
          }]
        }
      ]
    });

    // Format the response
    const cartResponse = {
      id: cart.id,
      items: cart.items ? cart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.Product ? item.Product.name : 'Product Unavailable',
        image: item.Product && item.Product.Photos && item.Product.Photos.length > 0 ? 
               item.Product.Photos[0].url : '/images/no-image.png',
        price: Number(item.price || 0),
        unit: item.Product ? item.Product.unit : 'unit',
        quantity: Number(item.quantity || 0),
        farmId: item.farmId || '',
        farmName: item.farmName || 'Unknown Farm',
        additionalServices: item.additionalServices || []
      })) : [],
      totalItems: cart.items ? cart.items.reduce((count, item) => count + Number(item.quantity || 0), 0) : 0,
      subtotal: Number(cart.subtotal || 0),
      taxes: Number(cart.taxes || 0),
      deliveryFee: Number(cart.deliveryFee || 0),
      discount: Number(cart.discount || 0),
      total: Number(cart.total || 0),
      options: {
        province: cart.province || 'BC',
        deliveryMethod: cart.deliveryMethod || 'delivery',
        applyFreeDelivery: Boolean(cart.applyFreeDelivery || false)
      }
    };

    return res.status(200).json(cartResponse);
  } catch (error) {
    logger.error('Error fetching cart:', error);
    // Return empty cart as fallback on error
    return res.status(200).json({
      id: 'error-fallback-cart',
      items: [],
      totalItems: 0,
      subtotal: 0,
      taxes: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      options: {
        province: 'BC',
        deliveryMethod: 'delivery',
        applyFreeDelivery: false
      }
    });
  }
});

// Use both paths for backward compatibility
router.post('/', async (req, res) => {
  // Forward to the /add endpoint
  return addItemToCart(req, res);
});

// Add item to cart
router.post('/add', async (req, res) => {
  return addItemToCart(req, res);
});

// Reusable function for adding items to cart
async function addItemToCart(req, res) {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      // Return guest cart response for unauthenticated users
      return res.status(200).json({
        id: 'guest-cart',
        items: [
          {
            id: 'temp-item-' + Date.now(),
            productId: req.body.productId,
            name: req.body.productName || 'Product',
            image: req.body.productImage || '/images/no-image.png',
            price: Number(req.body.price || 0),
            unit: req.body.unit || 'unit',
            quantity: Number(req.body.quantity || 1),
            farmId: req.body.farmId || '',
            farmName: req.body.farmName || 'Unknown Farm'
          }
        ],
        totalItems: Number(req.body.quantity || 1),
        subtotal: Number(req.body.price || 0) * Number(req.body.quantity || 1),
        taxes: 0,
        deliveryFee: 0,
        discount: 0,
        total: Number(req.body.price || 0) * Number(req.body.quantity || 1),
        options: {
          province: 'BC',
          deliveryMethod: 'delivery',
          applyFreeDelivery: false
        }
      });
    }

    // Find user's cart or create new one
    const [cart, created] = await Cart.findOrCreate({
      where: { 
        userId: req.user.id,
        status: 'active'
      }
    });

    // Find the product
    const product = await Product.findByPk(req.body.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find the farm
    const farm = await Farm.findByPk(product.farmId);

    // Check if item already exists in cart
    let cartItem = await CartItem.findOne({
      where: {
        cartId: cart.id,
        productId: req.body.productId
      }
    });

    if (cartItem) {
      // Update existing item quantity
      cartItem.quantity = Number(cartItem.quantity) + Number(req.body.quantity || 1);
      await cartItem.save();
    } else {
      // Create new cart item
      cartItem = await CartItem.create({
        cartId: cart.id,
        productId: req.body.productId,
        price: product.price,
        quantity: req.body.quantity || 1,
        farmId: product.farmId,
        farmName: farm ? farm.name : 'Unknown Farm'
      });
    }

    // Get updated cart with items
    const updatedCart = await Cart.findOne({
      where: { id: cart.id },
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{
            model: Product,
            attributes: ['id', 'name', 'price', 'unit', 'quantityAvailable', 'isAvailable']
          }]
        }
      ]
    });

    // Calculate cart totals
    let subtotal = 0;
    if (updatedCart.items) {
      subtotal = updatedCart.items.reduce((total, item) => total + (Number(item.price) * Number(item.quantity)), 0);
    }

    // Update cart with new totals
    await updatedCart.update({
      subtotal: subtotal,
      taxes: subtotal * 0.05, // 5% tax
      deliveryFee: subtotal > 50 ? 0 : 5, // Free delivery over $50
      total: subtotal + (subtotal * 0.05) + (subtotal > 50 ? 0 : 5)
    });

    // Format response
    const cartResponse = {
      id: updatedCart.id,
      items: updatedCart.items ? updatedCart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.Product ? item.Product.name : 'Product Unavailable',
        image: item.Product && item.Product.Photos && item.Product.Photos.length > 0 ? 
               item.Product.Photos[0].url : '/images/no-image.png',
        price: Number(item.price || 0),
        unit: item.Product ? item.Product.unit : 'unit',
        quantity: Number(item.quantity || 0),
        farmId: item.farmId || '',
        farmName: item.farmName || 'Unknown Farm',
        additionalServices: item.additionalServices || []
      })) : [],
      totalItems: updatedCart.items ? updatedCart.items.reduce((count, item) => count + Number(item.quantity || 0), 0) : 0,
      subtotal: Number(updatedCart.subtotal || 0),
      taxes: Number(updatedCart.taxes || 0),
      deliveryFee: Number(updatedCart.deliveryFee || 0),
      discount: Number(updatedCart.discount || 0),
      total: Number(updatedCart.total || 0),
      options: {
        province: updatedCart.province || 'BC',
        deliveryMethod: updatedCart.deliveryMethod || 'delivery',
        applyFreeDelivery: Boolean(updatedCart.applyFreeDelivery || false)
      }
    };

    return res.status(200).json(cartResponse);

  } catch (error) {
    logger.error('Error adding item to cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add item to cart',
      error: error.message
    });
  }
}

// Delete an item from the cart
router.delete('/items/:itemId', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      // Return empty guest cart
      return res.status(200).json({
        id: 'guest-cart',
        items: [],
        totalItems: 0,
        subtotal: 0,
        taxes: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        options: {
          province: 'BC',
          deliveryMethod: 'delivery',
          applyFreeDelivery: false
        }
      });
    }

    // Find the user's active cart
    const cart = await Cart.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No active cart found'
      });
    }

    // Delete the item
    const deleted = await CartItem.destroy({
      where: {
        id: req.params.itemId,
        cartId: cart.id
      }
    });

    if (deleted === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Recalculate cart totals
    await calculateCartTotals(cart.id);

    // Return the updated cart
    const updatedCart = await Cart.findByPk(cart.id, {
      include: [
        {
          model: CartItem,
          as: 'items',
          include: [{
            model: Product,
            attributes: ['id', 'name', 'price', 'unit', 'quantityAvailable', 'isAvailable']
          }]
        }
      ]
    });

    // Format the response
    const cartResponse = {
      id: updatedCart.id,
      items: updatedCart.items ? updatedCart.items.map(item => ({
        id: item.id,
        productId: item.productId,
        name: item.Product ? item.Product.name : 'Product Unavailable',
        image: item.Product && item.Product.Photos && item.Product.Photos.length > 0 ? 
               item.Product.Photos[0].url : '/images/no-image.png',
        price: Number(item.price || 0),
        unit: item.Product ? item.Product.unit : 'unit',
        quantity: Number(item.quantity || 0),
        farmId: item.farmId || '',
        farmName: item.farmName || 'Unknown Farm',
        additionalServices: item.additionalServices || []
      })) : [],
      totalItems: updatedCart.items ? updatedCart.items.reduce((count, item) => count + Number(item.quantity || 0), 0) : 0,
      subtotal: Number(updatedCart.subtotal || 0),
      taxes: Number(updatedCart.taxes || 0),
      deliveryFee: Number(updatedCart.deliveryFee || 0),
      discount: Number(updatedCart.discount || 0),
      total: Number(updatedCart.total || 0),
      options: {
        province: updatedCart.province || 'BC',
        deliveryMethod: updatedCart.deliveryMethod || 'delivery',
        applyFreeDelivery: Boolean(updatedCart.applyFreeDelivery || false)
      }
    };

    return res.status(200).json(cartResponse);
  } catch (error) {
    logger.error('Error removing item from cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
});

// Clear the cart
router.delete('/', async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      // Return empty guest cart
      return res.status(200).json({
        id: 'guest-cart',
        items: [],
        totalItems: 0,
        subtotal: 0,
        taxes: 0,
        deliveryFee: 0,
        discount: 0,
        total: 0,
        options: {
          province: 'BC',
          deliveryMethod: 'delivery',
          applyFreeDelivery: false
        }
      });
    }

    // Find the user's active cart
    const cart = await Cart.findOne({
      where: {
        userId: req.user.id,
        status: 'active'
      }
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'No active cart found'
      });
    }

    // Delete all items in the cart
    await CartItem.destroy({
      where: {
        cartId: cart.id
      }
    });

    // Update cart totals
    cart.subtotal = 0;
    cart.taxes = 0;
    cart.deliveryFee = 0;
    cart.discount = 0;
    cart.total = 0;
    cart.totalItems = 0;
    await cart.save();

    // Return empty cart
    const cartResponse = {
      id: cart.id,
      items: [],
      totalItems: 0,
      subtotal: 0,
      taxes: 0,
      deliveryFee: 0,
      discount: 0,
      total: 0,
      options: {
        province: cart.province || 'BC',
        deliveryMethod: cart.deliveryMethod || 'delivery',
        applyFreeDelivery: Boolean(cart.applyFreeDelivery || false)
      }
    };

    return res.status(200).json(cartResponse);
  } catch (error) {
    logger.error('Error clearing cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
});

/**
 * Helper function to calculate cart totals
 */
async function calculateCartTotals(cartId, options = {}, transaction = null) {
  try {
    // Get the cart with its items
    const cart = await Cart.findByPk(cartId, {
      include: [
        {
          model: CartItem,
          as: 'items'
        }
      ],
      transaction
    });

    if (!cart) throw new Error(`Cart with ID ${cartId} not found`);

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      
      // Add additional services if any
      if (item.additionalServices && item.additionalServices.length > 0) {
        itemTotal += item.additionalServices.reduce(
          (serviceSum, service) => serviceSum + service.price * item.quantity, 
          0
        );
      }
      
      return sum + itemTotal;
    }, 0);

    // Get tax rate based on province
    const taxRates = {
      'ON': 0.13, // Ontario HST
      'BC': 0.12, // British Columbia PST + GST
      'AB': 0.05, // Alberta GST only
      'QC': 0.14975, // Quebec QST + GST
      'NS': 0.15, // Nova Scotia HST
      'NB': 0.15, // New Brunswick HST
      'MB': 0.12, // Manitoba PST + GST
      'PE': 0.15, // Prince Edward Island HST
      'SK': 0.11, // Saskatchewan PST + GST
      'NL': 0.15, // Newfoundland and Labrador HST
      'YT': 0.05, // Yukon GST only
      'NT': 0.05, // Northwest Territories GST only
      'NU': 0.05  // Nunavut GST only
    };
    
    const province = options.province || cart.province || 'BC';
    const taxRate = taxRates[province] || 0.05; // Default to 5% GST
    const taxes = subtotal * taxRate;

    // Calculate delivery fee
    let deliveryFee = 0;
    const FREE_DELIVERY_THRESHOLD = 75;
    const STANDARD_DELIVERY_FEE = 7.99;
    
    if (cart.items.length > 0) {
      // Delivery method from options or cart
      const deliveryMethod = options.deliveryMethod || cart.deliveryMethod || 'delivery';
      
      if (deliveryMethod !== 'pickup') {
        // Free delivery over threshold
        if (subtotal >= FREE_DELIVERY_THRESHOLD) {
          deliveryFee = 0;
        } 
        // Free delivery from referral program or other offers
        else if (options.applyFreeDelivery || cart.applyFreeDelivery) {
          deliveryFee = 0;
        }
        // Standard delivery fee
        else {
          deliveryFee = STANDARD_DELIVERY_FEE;
        }
      }
    }

    // Use existing discount or 0
    const discount = cart.discount || 0;
    
    // Calculate total
    const total = subtotal + taxes + deliveryFee - discount;
    const totalItems = cart.items.reduce((count, item) => count + item.quantity, 0);
    
    // Update cart with calculated values
    cart.subtotal = subtotal;
    cart.taxes = taxes;
    cart.deliveryFee = deliveryFee;
    cart.total = total;
    cart.totalItems = totalItems;
    
    // Update options if provided
    if (options.province) cart.province = options.province;
    if (options.deliveryMethod) cart.deliveryMethod = options.deliveryMethod;
    if (options.applyFreeDelivery !== undefined) cart.applyFreeDelivery = options.applyFreeDelivery;
    
    await cart.save({ transaction });
    
    return cart;
  } catch (error) {
    logger.error('Error calculating cart totals:', error);
    throw error;
  }
}

module.exports = router;
