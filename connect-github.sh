#!/bin/bash

# Replace these with your GitHub username and repository name
GITHUB_USERNAME="your-username"
REPO_NAME="StudyTrackerNew"

# Add the remote repository
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# Push to the GitHub repository
git push -u origin main

echo "Repository connected and code pushed to GitHub!"
echo "Your project is now available at: https://github.com/$GITHUB_USERNAME/$REPO_NAME"
