-- SQL script to set up PostgreSQL for FreshFarmily

-- Create database if it doesn't exist
CREATE DATABASE freshfarmily;

-- Create user with password
CREATE USER freshfarmily_user WITH ENCRYPTED PASSWORD 'freshfarmily_pass';

-- Grant privileges to the user on the database
GRANT ALL PRIVILEGES ON DATABASE freshfarmily TO freshfarmily_user;

-- Connect to the freshfarmily database to grant additional privileges
\c freshfarmily

-- Grant privileges on all tables (current and future) to the user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO freshfarmily_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO freshfarmily_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO freshfarmily_user;

-- Make freshfarmily_user the owner of the public schema
ALTER SCHEMA public OWNER TO freshfarmily_user;
