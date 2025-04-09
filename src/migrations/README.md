# FreshFarmily Database Migrations

This directory contains all database migration files for the FreshFarmily application.

## Migration Structure

The migrations follow a consistent naming pattern and are organized chronologically:

### Core Migrations

These are the essential migrations required for setting up the FreshFarmily database:

1. **User System**
   - `20250326162915-create-user-migrations.js` - Creates the Users table

2. **Referrals**
   - `20250327-create-referral-migrations.js` - Creates the referral_info table

3. **Wishlist**
   - `20250327_create-wishlist-migrations.js` - Creates the wishlists table

4. **Farms**
   - `20250326_create-farm-migrations.js` - Creates the farms table (no pickup options as FreshFarmily handles all deliveries)

5. **Products**
   - `20250326-create-product-migrations.js` - Creates the products and product_reviews tables

6. **Orders**
   - `20250326_create-order-migrations.js` - Creates the orders and order_items tables

7. **Delivery System**
   - `20250326_create-delivery-migrations.js` - Creates delivery-related tables (deliveries, delivery_batches, route_optimization_history)

8. **Payment System**
   - `20250326_create-payment-migrations.js` - Creates payment-related tables (payment_info, farmer_payments, farmer_payouts)

9. **Pricing System**
   - `20250326_create-pricing-migrations.js` - Creates pricing-related tables (pricing_configurations, driver_compensation_configs)

### Special Migrations

- `20250401-reset-migrations.js` - A comprehensive migration that creates all tables in the correct order with proper relationships. Useful for new development environments or complete resets.

## The `/old` Directory

The `/old` directory contains previous versions of migrations that have been superseded by newer ones. These are kept for historical reference but should not be used for new setups.

## Running Migrations

We provide a script to help manage migrations:

```bash
# List current migration status
node scripts/test-migrations.js

# Run pending migrations
node scripts/test-migrations.js --run

# Reset the database (drop all tables and recreate)
node scripts/test-migrations.js --reset
```

## Migration Best Practices

1. **Never edit existing migrations** that have been applied to production databases
2. Create new migrations for schema changes instead
3. Always test migrations in development before applying to production
4. Foreign key references should use consistent table names (e.g., 'Users' not 'user')
5. Use proper casing for table names in the database (consistent with models)

## Business Logic Reflected in Migrations

- **Farm Delivery**: FreshFarmily handles all deliveries, so pickup fields have been removed from farm migrations
- **Default Farm**: The farm schema includes an `isDefault` field for farmers who own multiple farms

## Troubleshooting

If you encounter issues with migrations:

1. Check the Sequelize documentation for correct syntax
2. Ensure all referenced tables exist before creating foreign keys
3. Use the `--reset` flag with caution, as it will drop all tables
4. For local development, you can use the reset migration file directly

## Model-Migration Alignment

To ensure your models correctly reflect the database schema:

1. **Check for discrepancies** between models and actual database schema
   ```
   node scripts/describe-table.js <table_name>
   ```

2. **Update models** to match the database schema, not vice versa
   - Models should follow the same naming conventions as the database
   - Fields in models should exactly match column names in the database
   - Do not include fields in models that don't exist in the database

3. **Add migrations for schema changes**, don't just change models
   - When business requirements change, create a new migration
   - Example: `20250401-remove-pickup-fields.js` was created to reflect that FreshFarmily handles all deliveries

## Recent Schema Improvements

The following updates were made on April 1, 2025:

1. **Model-Database Alignment**: The Farm model was updated to correctly reflect the actual database schema
2. **Pickup Fields Confirmed Removed**: Verified that pickup-related fields are not in the database, aligning with the business decision that FreshFarmily handles all deliveries
3. **Field Naming Standardization**: Updated field names in the Farm model to match database column names (e.g., `contactEmail` instead of `email`)
