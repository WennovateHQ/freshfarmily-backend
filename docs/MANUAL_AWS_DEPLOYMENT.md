# Manual AWS Deployment Guide for FreshFarmily Backend

Since you're encountering issues with the Elastic Beanstalk CLI, here's a guide for deploying manually using the AWS Management Console.

## Step 1: Prepare Your Application for Deployment

First, let's create a deployment package:

1. **Clean up unnecessary files**:
   - Remove node_modules, logs, and other development files
   - Keep only production-necessary files

2. **Create a deployment zip file**:
   - Include all necessary source files
   - Include package.json and package-lock.json
   - Include .ebextensions directory with configurations
   - Include .env.production (rename to .env during deployment)

## Step 2: Set Up AWS Resources

### Create a PostgreSQL RDS Instance

1. **Navigate to RDS in AWS Console**:
   - Go to https://console.aws.amazon.com/rds/

2. **Create a database**:
   - Click "Create database"
   - Select "Standard create"
   - Choose PostgreSQL
   - Select version 13.x

3. **Configure settings**:
   - DB instance identifier: `freshfarmily-db`
   - Master username: `dbadmin`
   - Create a secure password and save it
   - Instance configuration: Select t3.micro for cost-effectiveness
   - Storage: Start with 20GB General Purpose SSD 
   - Enable storage autoscaling with max 100GB
   - VPC: Use default VPC or create a new one
   - Public access: No (for security)
   - Create a new security group: `freshfarmily-db-sg`
   - Initial database name: `freshfarmily`
   - Click "Create database"

### Create an Elastic Beanstalk Environment

1. **Navigate to Elastic Beanstalk**:
   - Go to https://console.aws.amazon.com/elasticbeanstalk/

2. **Create a new environment**:
   - Click "Create a new environment"
   - Select "Web server environment"
   - Application name: `FreshFarmily`
   - Environment name: `FreshFarmily-env`
   - Platform: Node.js
   - Platform branch: Node.js 18
   - Application code: Upload your zip file

3. **Configure service access**:
   - Create a new service role or use an existing one
   - Create a new EC2 instance profile or use an existing one

4. **Set up networking**:
   - VPC: Same as your RDS instance
   - Subnets: Select appropriate subnets 
   - Security group: Create a new one or select existing

5. **Configure instance settings**:
   - Instance type: t2.micro is fine to start with
   - Root volume type: General Purpose SSD
   - Size: 10 GB

6. **Set up environment variables**:
   - DB_HOST: Your RDS endpoint
   - DB_PORT: 5432
   - DB_NAME: freshfarmily
   - DB_USER: dbadmin
   - DB_PASSWORD: Your RDS password
   - NODE_ENV: production
   - PORT: 8080
   - TESTING: false
   - JWT_SECRET: Your secure JWT secret

7. **Review and submit**:
   - Click "Create environment"

## Step 3: Configure Security

### Update Security Groups

1. **Modify the RDS security group**:
   - Allow inbound PostgreSQL traffic (port 5432) from the Elastic Beanstalk security group

2. **Modify the Elastic Beanstalk security group**:
   - Allow inbound HTTP/HTTPS traffic (ports 80/443) from anywhere

### Set Up HTTPS (Optional but Recommended)

1. **Request an SSL certificate**:
   - Go to AWS Certificate Manager
   - Request a public certificate for your domain
   - Validate ownership of the domain
   - Once issued, note the ARN

2. **Configure HTTPS in Elastic Beanstalk**:
   - In your environment, go to Configuration
   - Modify the Load Balancer configuration
   - Add a listener for HTTPS (port 443)
   - Select your certificate
   - Apply changes

## Step 4: Connect Your Domain (Optional)

1. **Create a CNAME record**:
   - In your domain registrar's DNS settings
   - Create a CNAME record pointing to your Elastic Beanstalk URL

2. **Update your mobile app configuration**:
   - Update the API endpoint in your mobile app to use your new domain

## Step 5: Initialize the Database

You'll need to run the initial database setup scripts:

1. **SSH into your Elastic Beanstalk instance**:
   - Use the AWS Management Console's EC2 section
   - Find your instance and connect via SSH

2. **Run migrations**:
   ```
   cd /var/app/current
   node setupDb.js
   ```

## Monitoring and Maintenance

### Set Up CloudWatch Alarms

1. **Navigate to CloudWatch**:
   - Go to AWS CloudWatch console

2. **Create alarms for**:
   - CPU usage
   - Memory usage
   - Request latency
   - Error rates

### Regular Backups

1. **Set up automated RDS backups**:
   - In the RDS console, modify your instance
   - Enable automated backups
   - Set retention period (e.g., 7 days)

## Updating Your Application

To update your deployed application:

1. **Create a new zip file** with your updated code
2. **Upload the zip** in the Elastic Beanstalk console
3. **Deploy the new version**

---

This manual approach gives you full control over the deployment process. Once your application is successfully deployed, you can explore setting up a CI/CD pipeline using AWS CodePipeline for future automated deployments.
