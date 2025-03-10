@echo off
echo ========== FreshFarmily Backend GitHub Repository Setup ==========

REM Set GitHub organization or username
echo Please enter your GitHub username or organization name:
set /p GITHUB_ORG=

REM Set repository name
set REPO_NAME=freshfarmily-backend

REM Ask for GitHub token
echo Please enter your GitHub personal access token:
set /p GITHUB_TOKEN=

echo.
echo Setting up repository %GITHUB_ORG%/%REPO_NAME%...
echo.

REM Check if git is already initialized
if exist .git (
    echo Git repository already initialized
) else (
    echo Initializing git repository...
    git init
)

REM Create repository on GitHub
echo Creating repository on GitHub: %GITHUB_ORG%/%REPO_NAME%
curl -X POST -H "Authorization: token %GITHUB_TOKEN%" -H "Accept: application/vnd.github.v3+json" https://api.github.com/user/repos -d "{\"name\":\"%REPO_NAME%\",\"description\":\"FreshFarmily Backend API with Express.js and PostgreSQL\",\"private\":false}"

REM Add all files
git add .

REM Commit changes
git commit -m "Initial commit for FreshFarmily Backend"

REM Add remote
git remote add origin https://github.com/%GITHUB_ORG%/%REPO_NAME%.git

REM Push to GitHub
git push -u origin main

echo.
echo ========== Repository Setup Complete ==========
echo.
echo The FreshFarmily Backend has been successfully pushed to GitHub:
echo https://github.com/%GITHUB_ORG%/%REPO_NAME%
echo.
