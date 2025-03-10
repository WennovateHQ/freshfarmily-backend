@echo off
echo ========== Preparing FreshFarmily Backend Deployment Package ==========

REM Create deployment directory
if exist deployment rmdir /s /q deployment
mkdir deployment

REM Copy necessary files
echo Copying source files...
xcopy src deployment\src /s /i /q
xcopy .ebextensions deployment\.ebextensions /s /i /q
copy package.json deployment\
copy package-lock.json deployment\
copy .env.production deployment\.env

REM Zip is required for this operation, please install it if not available
echo Creating zip file...
cd deployment
powershell Compress-Archive -Path * -DestinationPath ..\freshfarmily-backend.zip -Force
cd ..

echo Deployment package created: freshfarmily-backend.zip
echo ========== Deployment Package Ready ==========
echo.
echo Upload this zip file to AWS Elastic Beanstalk through the AWS Management Console
echo See docs\MANUAL_AWS_DEPLOYMENT.md for detailed instructions
