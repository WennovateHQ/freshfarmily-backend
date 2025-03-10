#!/bin/bash
# FreshFarmily AWS Deployment Script

echo "========== FreshFarmily Backend Deployment =========="
echo "Preparing deployment to AWS Elastic Beanstalk..."

# Install AWS CLI and EB CLI if not already installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Please install it first."
    echo "Visit: https://aws.amazon.com/cli/"
    exit 1
fi

if ! command -v eb &> /dev/null; then
    echo "Elastic Beanstalk CLI not found. Please install it first."
    echo "Run: pip install awsebcli"
    exit 1
fi

# Check if user is logged in to AWS
aws sts get-caller-identity > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Please configure AWS credentials first:"
    echo "Run: aws configure"
    exit 1
fi

# Initialize Elastic Beanstalk if not already initialized
if [ ! -d ".elasticbeanstalk" ]; then
    echo "Initializing Elastic Beanstalk..."
    eb init
fi

# Create necessary parameter store entries
echo "Setting up AWS Parameter Store secrets..."
echo "Enter JWT Secret key for production:" 
read -s JWT_SECRET
echo "Enter Database password for production:"
read -s DB_PASSWORD

# Store secrets in AWS Parameter Store
aws ssm put-parameter --name "FRESHFARMILY_JWT_SECRET" --value "$JWT_SECRET" --type "SecureString" --overwrite
aws ssm put-parameter --name "FRESHFARMILY_DB_PASSWORD" --value "$DB_PASSWORD" --type "SecureString" --overwrite

# Check if environment exists, otherwise create it
ENVIRONMENT_NAME="FreshFarmily-env"
eb list | grep -q "$ENVIRONMENT_NAME"
if [ $? -ne 0 ]; then
    echo "Creating new Elastic Beanstalk environment..."
    eb create $ENVIRONMENT_NAME --database --database.engine postgres --database.password "$DB_PASSWORD"
else
    echo "Deploying to existing environment: $ENVIRONMENT_NAME"
fi

# Deploy the application
echo "Deploying application..."
eb deploy

echo "Deployment complete! Your application should be accessible at:"
eb status | grep CNAME

echo "========== Deployment Finished =========="
