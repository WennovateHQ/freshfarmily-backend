# FreshFarmily Backend AWS Deployment Guide

This guide walks you through deploying the FreshFarmily Node.js backend to AWS Elastic Beanstalk with a PostgreSQL database.

## Prerequisites

1. **AWS Account**: You need an active AWS account with administrative privileges
2. **AWS CLI**: Install and configure the AWS Command Line Interface
3. **Elastic Beanstalk CLI**: Install the EB CLI for easier deployment
4. **Node.js and npm**: Ensure you have Node.js 18.x or later installed

## Step 1: Install Required Tools

### AWS CLI Installation

**For Windows:**
1. Download the AWS CLI MSI installer from [AWS CLI website](https://aws.amazon.com/cli/)
2. Run the downloaded MSI installer and follow the instructions
3. Verify installation by running:
   ```
   aws --version
   ```

### Elastic Beanstalk CLI Installation

Install the EB CLI using pip:

```
pip install awsebcli
```

Verify installation:
```
eb --version
```

## Step 2: Configure AWS Credentials

Configure your AWS credentials:

```
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (recommended: us-west-2)
- Default output format (json)

## Step 3: Prepare Your Application

1. **Test your application locally first:**
   ```
   cd node-backend
   npm install
   npm start
   ```

2. **Create a .gitignore file** (if not already present):
   ```
   node_modules
   .env
   logs
   *.log
   ```

3. **Initialize git repository** (if not already done):
   ```
   git init
   git add .
   git commit -m "Initial commit for deployment"
   ```

## Step 4: Set Up AWS Parameter Store Secrets

Store sensitive credentials in AWS Parameter Store:

```
aws ssm put-parameter --name "FRESHFARMILY_JWT_SECRET" --value "your-very-secure-jwt-secret" --type "SecureString"
aws ssm put-parameter --name "FRESHFARMILY_DB_PASSWORD" --value "your-secure-db-password" --type "SecureString"
```

## Step 5: Initialize Elastic Beanstalk

In your project directory:

```
cd node-backend
eb init
```

Follow the prompts:
1. Select your region (match the region from aws configure)
2. Create a new application: "FreshFarmily"
3. Select platform: Node.js
4. Select Node.js version: 18.x latest
5. Set up SSH for instances: Yes (if you want to connect to the EC2 instances)

## Step 6: Update Configuration Files

We've already created the necessary configuration files:

1. `.elasticbeanstalk/config.yml` - Basic EB configuration
2. `.ebextensions/01_environment.config` - Environment configuration
3. `.ebextensions/02_database.config` - Database integration

**Important:** Update these files with your specific VPC, subnet, and security group IDs.

## Step 7: Create RDS Database Parameters

Before creating your environment, set up a database configuration:

```
eb create FreshFarmily-env --database --database.engine postgres --database.version 13.7 --database.instance db.t3.micro --database.size 5 --database.username dbadmin --database.password "your-secure-db-password"
```

## Step 8: Deploy Your Application

Deploy your application:

```
eb deploy
```

## Step 9: Configure Environment Variables 

Set environment variables for your application:

```
eb setenv NODE_ENV=production PORT=8080 TESTING=false
```

## Step 10: Run Database Migrations

After deployment, you need to set up your database:

```
eb ssh
cd /var/app/current
npm run migrate
```

## Step 11: Verify Deployment

Check the status of your deployment:

```
eb status
```

Access your application at the provided CNAME URL.

## Step 12: Monitoring and Maintenance

### View Logs
```
eb logs
```

### SSH into the instance
```
eb ssh
```

### Scale your application
```
eb scale 2
```

## Troubleshooting

### Connection Issues
- Check security groups to ensure proper port access
- Verify database connection parameters
- Check environment variables in Elastic Beanstalk console

### Database Migration Failures
- Connect to the instance via SSH and check logs
- Run migrations manually to see detailed errors

### Deployment Failures
- Check the deployment logs: `eb logs`
- Ensure your application works locally without errors
- Verify your Node.js version matches the platform version

## Automating Deployment

For CI/CD pipeline integration, you can use:
- AWS CodePipeline
- AWS CodeBuild
- GitHub Actions

## Production Readiness Checklist

Before finalizing your production deployment:

1. Set up CloudWatch alarms for monitoring
2. Enable AWS X-Ray for performance tracing
3. Set up automated backups for your RDS instance
4. Configure proper security groups and network ACLs
5. Implement AWS WAF for web application firewall protection
6. Set up a custom domain with Route 53
7. Configure SSL/TLS with AWS Certificate Manager

---

By following this guide, you'll have successfully deployed the FreshFarmily Node.js backend to AWS with a PostgreSQL database. For ongoing maintenance and updates, simply make your changes locally, commit them, and run `eb deploy` again.
