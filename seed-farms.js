/**
 * Script to seed farm data for testing
 */

require('dotenv').config();
const { Farm } = require('./src/models/farm');
const { User } = require('./src/models/user');
const { sequelize } = require('./src/config/database');

async function seedFarms() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Seeding farm data...');
    
    // Check for existing farms
    const existingFarmCount = await Farm.count({ transaction });
    console.log(`Found ${existingFarmCount} existing farms`);
    
    if (existingFarmCount > 0) {
      console.log('Farms already exist in the database, skipping seed');
      await transaction.commit();
      return true;
    }
    
    // Create a farmer user if one doesn't exist
    let farmer = await User.findOne({
      where: { email: 'farmer@freshfarmily.com', role: 'farmer' },
      transaction
    });
    
    if (!farmer) {
      console.log('Creating farmer user...');
      farmer = await User.create({
        email: 'farmer@freshfarmily.com',
        password: '$2b$10$6BrbbAz9c0AugPHYCQffmeZzKGGcgaHAk0yIUAEsgP5j1SjEcAUO6', // password123
        firstName: 'Test',
        lastName: 'Farmer',
        role: 'farmer',
        status: 'active',
        emailVerified: true
      }, { transaction });
      console.log(`Farmer user created with ID: ${farmer.id}`);
    } else {
      console.log(`Using existing farmer with ID: ${farmer.id}`);
    }
    
    // Seed sample farms
    const sampleFarms = [
      {
        name: 'Green Valley Organic Farm',
        description: 'A family-owned organic farm specializing in heirloom vegetables and free-range eggs.',
        address: '1234 Farm Road',
        city: 'Springfield',
        state: 'OR',
        zipCode: '97477',
        latitude: 44.0462,
        longitude: -123.0236,
        phoneNumber: '541-555-1234',
        email: 'info@greenvalleyfarm.com',
        website: 'https://www.greenvalleyfarm.com',
        isVerified: true,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854',
        certifications: ['USDA Organic', 'Non-GMO Project Verified'],
        acceptsPickup: true,
        acceptsDelivery: true,
        deliveryRange: 25,
        pickupInstructions: 'Visit our farm stand Tuesday-Sunday from 9am-5pm for pickup.',
        userId: farmer.id
      },
      {
        name: 'Sunrise Acres',
        description: 'Sustainable farm producing seasonal fruits, vegetables, and artisanal cheeses.',
        address: '789 Meadow Lane',
        city: 'Eugene',
        state: 'OR',
        zipCode: '97405',
        latitude: 44.0344,
        longitude: -123.0951,
        phoneNumber: '541-555-9876',
        email: 'contact@sunriseacres.org',
        website: 'https://www.sunriseacres.org',
        isVerified: true,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1585517350263-4d2d5ede084a',
        certifications: ['Oregon Tilth Certified Organic'],
        acceptsPickup: true,
        acceptsDelivery: true,
        deliveryRange: 35,
        pickupInstructions: 'Pickup available Monday-Friday from 10am-4pm at our farm store.',
        userId: farmer.id
      },
      {
        name: 'Blue Mountain Berries',
        description: 'Specializing in premium blueberries, strawberries, and blackberries grown sustainably.',
        address: '456 Berry Lane',
        city: 'Corvallis',
        state: 'OR',
        zipCode: '97330',
        latitude: 44.5709,
        longitude: -123.2836,
        phoneNumber: '541-555-4321',
        email: 'info@bluemountainberries.com',
        website: 'https://www.bluemountainberries.com',
        isVerified: true,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1595348020949-87cdfbb44174',
        certifications: ['Salmon-Safe', 'Bee Friendly Farm'],
        acceptsPickup: true,
        acceptsDelivery: false,
        deliveryRange: 0,
        pickupInstructions: 'U-pick available in summer months, 7am-7pm daily. Farm stand open year-round.',
        userId: farmer.id
      }
    ];
    
    // Create farms
    for (const farmData of sampleFarms) {
      const farm = await Farm.create(farmData, { transaction });
      console.log(`Created farm: ${farm.name} with ID: ${farm.id}`);
    }
    
    await transaction.commit();
    console.log('Farm data seeded successfully!');
    return true;
  } catch (error) {
    await transaction.rollback();
    console.error('Error seeding farm data:', error);
    return false;
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Seed farms
seedFarms()
  .then(success => {
    console.log(success ? 'Farm seeding completed successfully.' : 'Farm seeding failed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Unhandled error:', err);
    process.exit(1);
  });
