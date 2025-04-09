/**
 * Test Farm Orders Query
 * 
 * This script tests the SQL query used to fetch orders for a farm
 * to verify that all table name references are correct.
 */

const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

async function testFarmOrders() {
  try {
    logger.info('Starting farm orders query test...');
    
    // Get a list of farms first
    const [farms] = await sequelize.query(`
      SELECT id, name, "farmerId" 
      FROM farms 
      LIMIT 5
    `);
    
    if (farms.length === 0) {
      logger.warn('No farms found in the database');
      return;
    }
    
    logger.info(`Found ${farms.length} farms to test with`);
    
    // Test the order query for each farm
    for (const farm of farms) {
      const farmId = farm.id;
      logger.info(`Testing orders query for farm "${farm.name}" (ID: ${farmId})`);
      
      // This is the exact query from orderRoutes.js that was causing issues
      const [orders] = await sequelize.query(`
        SELECT 
          o.id, o."orderNumber", o.status, o."totalAmount", o."createdAt",
          u.id as "userId", u.email, u."firstName", u."lastName",
          COUNT(DISTINCT oi.id) as "itemCount"
        FROM orders o
        JOIN "order_items" oi ON o.id = oi."orderId"
        JOIN products p ON oi."productId" = p.id
        JOIN users u ON o."userId" = u.id
        WHERE p."farmId" = :farmId
        GROUP BY o.id, u.id
        ORDER BY o."createdAt" DESC
        LIMIT 10
      `, {
        replacements: { farmId }
      });
      
      logger.info(`Query executed successfully, found ${orders.length} orders for farm ${farmId}`);
      
      if (orders.length > 0) {
        console.log(`\nORDERS FOR FARM "${farm.name}":`);
        orders.forEach((order, index) => {
          console.log(`${index + 1}. Order #${order.orderNumber}`);
          console.log(`   Status: ${order.status}`);
          console.log(`   Total: $${order.totalAmount}`);
          console.log(`   Customer: ${order.firstName} ${order.lastName} (${order.email})`);
          console.log(`   Items: ${order.itemCount}`);
          console.log(`   Date: ${new Date(order.createdAt).toLocaleString()}`);
          console.log('---');
        });
      } else {
        console.log(`\nNo orders found for farm "${farm.name}"`);
      }
    }
    
    logger.info('Farm orders query test completed successfully');
  } catch (error) {
    logger.error(`Error testing farm orders query: ${error.message}`);
    console.error(error);
  } finally {
    await sequelize.close();
    logger.info('Test script completed.');
  }
}

// Run the test
testFarmOrders();
