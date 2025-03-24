/**
 * Migration: Add isDefault column to farms table
 * 
 * Adds the isDefault column to the farms table to allow farmers to set a default farm
 */

const { DataTypes } = require('sequelize');
const logger = require('../utils/logger');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      logger.info('Migration: Adding isDefault column to farms table');
      await queryInterface.addColumn('farms', 'isDefault', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      logger.info('Successfully added isDefault column to farms table');
      return;
    } catch (error) {
      logger.error(`Error adding isDefault column: ${error.message}`);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      logger.info('Migration: Removing isDefault column from farms table');
      await queryInterface.removeColumn('farms', 'isDefault');
      logger.info('Successfully removed isDefault column from farms table');
      return;
    } catch (error) {
      logger.error(`Error removing isDefault column: ${error.message}`);
      throw error;
    }
  }
};
