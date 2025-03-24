# Deploying FreshFarmily Backend to AWS App Runner

This guide walks you through deploying the FreshFarmily Node.js backend to AWS App Runner, a fully managed service that makes it easy to deploy containerized web applications.

## Prerequisites

1. **AWS Account**: You need an active AWS account
2. **AWS CLI**: Install and configure the AWS Command Line Interface
3. **Source Code**: Your FreshFarmily backend code ready for deployment
4. **AWS IAM Permissions**: Ensure you have permissions to create and manage App Runner services

## Step 1: Set Up AWS Parameter Store Secrets

Before deployment, store sensitive credentials in AWS Systems Manager Parameter Store:

```bash
# Store database credentials
aws ssm put-parameter --name "/freshfarmily/db/host" --value "freshfarmily-db.clg6mgya0hdf.us-west-2.rds.amazonaws.com" --type "SecureString"
aws ssm put-parameter --name "/freshfarmily/db/port" --value "5432" --type "String"
aws ssm put-parameter --name "/freshfarmily/db/name" --value "freshfarmily_db" --type "String"
aws ssm put-parameter --name "/freshfarmily/db/user" --value "dbadmin" --type "SecureString"
aws ssm put-parameter --name "/freshfarmily/db/password" --value "FarmLocal2025!" --type "SecureString"

# Store JWT secret
aws ssm put-parameter --name "/freshfarmily/jwt/secret" --value "OHFYM7AGvTEkZSmqzecj2iWCrbLBR6fPldN04XKV5x8sQnpyUJD9gwtua3ohI1" --type "SecureString"
```

## Step 2: Create an RDS PostgreSQL Database (if not already created)

If you haven't already created a database:

1. Go to the AWS RDS Console: https://console.aws.amazon.com/rds/
2. Click "Create database"
3. Select PostgreSQL
4. Configure the database:
   - DB instance identifier: `freshfarmily-db`
   - Master username: `dbadmin`
   - Master password: [create a secure password]
   - DB instance size: db.t3.micro (for development)
   - Storage: 20GB GP2
   - Connectivity: Create a new VPC or use an existing one
   - Public access: No (for security)
5. Create the database

## Step 3: Create an ECR Repository for Your Docker Image

1. Go to the AWS ECR Console: https://console.aws.amazon.com/ecr/
2. Click "Create repository"
3. Name it `freshfarmily-backend`
4. Keep the default settings and click "Create repository"

## Step 4: Create a Dockerfile

Create a Dockerfile in your project root:

```
FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080
ENV TESTING=false

# Start the application
CMD ["node", "src/server.js"]
```

## Step 5: Build and Push Docker Image to ECR

```bash
# Log in to ECR
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin [your-account-id].dkr.ecr.us-west-2.amazonaws.com

# Build Docker image
docker build -t freshfarmily-backend .

# Tag the image
docker tag freshfarmily-backend:latest [your-account-id].dkr.ecr.us-west-2.amazonaws.com/freshfarmily-backend:latest

# Push to ECR
docker push [your-account-id].dkr.ecr.us-west-2.amazonaws.com/freshfarmily-backend:latest
```

## Step 6: Set Up AWS App Runner Service

1. Go to the AWS App Runner Console: https://console.aws.amazon.com/apprunner/
2. Click "Create service"
3. For source:
   - Select "Container registry"
   - Provider: Amazon ECR
   - Container image URI: [your-account-id].dkr.ecr.us-west-2.amazonaws.com/freshfarmily-backend:latest
   - Port: 8080

4. For deployment settings:
   - Deployment trigger: Automatic (if you want updates to deploy automatically)
   - ECR access role: Create new service role

5. For service settings:
   - Service name: `freshfarmily-backend`
   - Environment variables:
     - `NODE_ENV`: production
     - `PORT`: 8080
     - `TESTING`: false
     - `DB_HOST`: ${ssm:/freshfarmily/db/host}
     - `DB_PORT`: ${ssm:/freshfarmily/db/port}
     - `DB_NAME`: ${ssm:/freshfarmily/db/name}
     - `DB_USER`: ${ssm:/freshfarmily/db/user}
     - `DB_PASSWORD`: ${ssm:/freshfarmily/db/password}
     - `JWT_SECRET`: ${ssm:/freshfarmily/jwt/secret}
     - `JWT_ACCESS_EXPIRATION`: 30m
     - `JWT_REFRESH_EXPIRATION`: 7d

6. For networking:
   - VPC connector: Create new VPC connector
   - VPC: Select the same VPC as your RDS instance
   - Subnets: Select appropriate subnets (same as RDS)
   - Security groups: Create a new security group or select existing one

7. Click "Create & Deploy"

## Step 7: Configure Security and Networking

1. Update your RDS security group to allow connections from the App Runner service:
   - Go to your RDS security group
   - Add an inbound rule for PostgreSQL (port 5432)
   - Source: The security group ID of your App Runner service

2. Test the connection:
   - Wait for App Runner deployment to complete
   - Check the logs for any connection issues

## Step 8: Run Database Migrations

Since App Runner doesn't provide direct SSH access, you have three options to run migrations:

1. **Add migration to the startup script**:
   - Modify your server.js to run migrations on startup

2. **Create a one-time task**:
   - Use AWS ECS tasks to run a one-time migration

3. **Use an initialization endpoint**:
   - Create a secure admin endpoint that triggers migrations
   - Call it once after deployment

## Step 9: Update Mobile App Configuration

Update your mobile app configuration to point to the new App Runner endpoint:

1. Edit the `config.dart` file:
   - Set `apiUrl` to your App Runner service URL
   - Ensure `testingMode` is set to `false`

2. Test the connection with your mobile apps

## Step 10: Set Up Monitoring and Logging

1. **CloudWatch Logs**: App Runner automatically sends logs to CloudWatch
   - Go to CloudWatch console to view logs
   - Set up log-based alerts for errors

2. **CloudWatch Alarms**:
   - Create alarms for HTTP 5xx errors
   - Monitor CPU and memory utilization

## Important Security Considerations

1. **JWT Authentication**: Your implementation includes role-based permissions for different user types (admin, farmer, driver, consumer). In production:
   - Use a strong, unique JWT secret
   - Store it in Parameter Store (as we've done)
   - Set appropriate token expiration times

2. **Database Security**:
   - Ensure your database is not publicly accessible
   - Use encrypted connections (SSL)
   - Implement regular backups

3. **HTTPS Traffic**:
   - App Runner provides HTTPS endpoints by default
   - Update your mobile app to use HTTPS

## Cost Optimization

AWS App Runner charges based on:
- Compute resources (vCPU and memory)
- Provisioned concurrency
- Idle time

To optimize costs:
1. Choose appropriate instance size
2. Configure auto-scaling appropriately
3. Consider using provisioned concurrency for consistent workloads

## Troubleshooting

1. **Connection Issues**:
   - Check security group rules
   - Verify VPC and subnet configurations
   - Test database connection parameters

2. **Deployment Failures**:
   - Check App Runner logs in CloudWatch
   - Verify Docker image builds correctly locally
   - Ensure all environment variables are set properly

3. **Runtime Errors**:
   - Check application logs in CloudWatch
   - Test API endpoints after deployment
   - Verify database migrations completed successfully
