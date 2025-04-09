/**
 * FreshFarmily Migration: Remove Pickup Fields
 * Date: 2025-04-01
 * 
 * This migration removes the pickup-related fields from the farms table
 * to align with the business decision that FreshFarmily handles all deliveries.
 */

'use strict';

async function up(queryInterface, Sequelize) {
  console.log('Removing pickup fields from farms table');
  
  try {
    // Remove acceptsPickup column
    await queryInterface.removeColumn('farms', 'acceptsPickup');
    
    // Remove pickupInstructions column
    await queryInterface.removeColumn('farms', 'pickupInstructions');
    
    console.log('Successfully removed pickup fields from farms table');
    return Promise.resolve();
  } catch (error) {
    console.error('Error removing pickup fields:', error);
    return Promise.reject(error);
  }
}

async function down(queryInterface, Sequelize) {
  console.log('Restoring pickup fields to farms table');
  
  try {
    // Add acceptsPickup column back
    await queryInterface.addColumn('farms', 'acceptsPickup', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
    
    // Add pickupInstructions column back
    await queryInterface.addColumn('farms', 'pickupInstructions', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    
    console.log('Successfully restored pickup fields to farms table');
    return Promise.resolve();
  } catch (error) {
    console.error('Error restoring pickup fields:', error);
    return Promise.reject(error);
  }
}

module.exports = {
  up,
  down
};
