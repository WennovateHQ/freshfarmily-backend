/**
 * One-time script to activate a user for testing
 */

require('dotenv').config();
const { User } = require('./src/models');
const { sequelize } = require('./src/config/database');

async function activateUser(email) {
  try {
    console.log(`Attempting to activate user with email: ${email}`);
    
    // Find the user
    const user = await User.findOne({ where: { email } });
    
    if (!user) {
      console.error(`User with email ${email} not found`);
      return false;
    }
    
    console.log(`Found user: ${user.id}, current status: ${user.status}`);
    
    // Update user status
    user.status = 'active';
    user.emailVerified = true;
    await user.save();
    
    console.log(`User ${user.id} activated successfully!`);
    return true;
  } catch (error) {
    console.error('Error activating user:', error);
    return false;
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Activate the test user
const email = 'toturlad@gmail.com';
activateUser(email)
  .then(success => {
    console.log(success ? 'Activation completed successfully.' : 'Activation failed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
