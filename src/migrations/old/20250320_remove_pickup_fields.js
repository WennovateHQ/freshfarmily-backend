/**
 * Migration: Remove Pickup Fields
 * 
 * Removes the pickup-related fields from the Farm model since FreshFarmily now handles all deliveries
 */

const { DataTypes } = require('sequelize');
const logger = require('../../utils/logger');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      logger.info('Migration: Removing pickup fields from farms table');
      await queryInterface.removeColumn('farms', 'acceptsPickup');
      await queryInterface.removeColumn('farms', 'pickupInstructions');
      logger.info('Successfully removed pickup fields from farms table');
      return;
    } catch (error) {
      logger.error(`Error removing pickup fields: ${error.message}`);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      logger.info('Migration: Reverting removal of pickup fields from farms table');
      await queryInterface.addColumn('farms', 'acceptsPickup', {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      });
      await queryInterface.addColumn('farms', 'pickupInstructions', {
        type: DataTypes.TEXT,
        allowNull: true
      });
      logger.info('Successfully added back pickup fields to farms table');
      return;
    } catch (error) {
      logger.error(`Error adding back pickup fields: ${error.message}`);
      throw error;
    }
  }
};
