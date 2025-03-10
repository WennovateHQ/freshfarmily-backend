-- SQL script to set up PostgreSQL for FreshFarmily

-- Create database if it doesn't exist
CREATE DATABASE freshfarmily;

-- Create user with password and LOGIN privilege
CREATE USER freshfarmily_user WITH 
    ENCRYPTED PASSWORD 'freshfarmily_pass'
    LOGIN;  -- Explicitly grant LOGIN privilege

-- Grant privileges to the user on the database
GRANT ALL PRIVILEGES ON DATABASE freshfarmily TO freshfarmily_user;

-- The remaining commands need to be run after connecting to the freshfarmily database
-- In pgAdmin, you'll need to run this part separately after connecting to the freshfarmily database in pgAdmin

-- Grant privileges on all tables (current and future) to the user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO freshfarmily_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO freshfarmily_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO freshfarmily_user;
GRANT CREATE ON SCHEMA public TO freshfarmily_user;
GRANT USAGE ON SCHEMA public TO freshfarmily_user;

-- Make the user the owner of the public schema
ALTER SCHEMA public OWNER TO freshfarmily_user;

-- Grant additional permissions needed for Sequelize with ENUMs
GRANT CREATE ON DATABASE freshfarmily TO freshfarmily_user;