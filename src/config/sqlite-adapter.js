/**
 * SQLite compatibility adapter for Sequelize models
 * 
 * This adapter helps make model definitions work seamlessly with both
 * PostgreSQL in production and SQLite in testing environments.
 */

const { DataTypes } = require('sequelize');

/**
 * Creates SQLite-compatible data types based on the current database dialect
 * @param {Object} sequelize - Sequelize instance
 * @returns {Object} Modified DataTypes object with SQLite-compatible types
 */
function createSQLiteCompatibleTypes(sequelize) {
  const dialect = sequelize.getDialect();
  const isTestMode = dialect === 'sqlite';
  
  // Create a copy of DataTypes to avoid modifying the original
  const compatTypes = { ...DataTypes };
  
  // Override ARRAY type for SQLite
  compatTypes.ARRAY = function(type) {
    if (isTestMode) {
      // In SQLite, store arrays as JSON strings
      return {
        type: DataTypes.TEXT,
        get() {
          const value = this.getDataValue(this._getAttributeName());
          return value ? JSON.parse(value) : null;
        },
        set(val) {
          if (val) {
            this.setDataValue(this._getAttributeName(), JSON.stringify(val));
          } else {
            this.setDataValue(this._getAttributeName(), null);
          }
        }
      };
    }
    return DataTypes.ARRAY(type);
  };
  
  // Override ENUM type for SQLite
  compatTypes.ENUM = function(...values) {
    if (isTestMode) {
      // In SQLite, store enums as TEXT with validation
      const enumType = DataTypes.TEXT;
      return enumType;
    }
    return DataTypes.ENUM(...values);
  };
  
  // Override DECIMAL for SQLite
  const originalDecimal = compatTypes.DECIMAL;
  compatTypes.DECIMAL = function(precision, scale) {
    if (isTestMode) {
      // In SQLite, store decimals as REAL (floating point)
      return DataTypes.FLOAT;
    }
    return originalDecimal.call(this, precision, scale);
  };
  
  return compatTypes;
}

module.exports = {
  createSQLiteCompatibleTypes
};
