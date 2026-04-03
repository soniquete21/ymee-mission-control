#!/bin/bash
cd ~/Documents/ai-agent/mission-control

# Make sure we have the latest code
git add .
git commit -m "Deploy update" || true
git push origin main

echo ""
echo "✅ Code pushed to GitHub!"
echo ""
echo "Now go to Railway dashboard and:"
echo "1. Click '+ Add' button"  
echo "2. Select 'GitHub Repo'"
echo "3. Choose 'soniquete21/ymee-mission-control'"
echo "4. Railway will auto-deploy"
echo ""
echo "GitHub repo: https://github.com/soniquete21/ymee-mission-control"
echo "Railway: https://railway.app/project/9ddafbb1-07d3-4949-b8c1-7173e0d941c7"
