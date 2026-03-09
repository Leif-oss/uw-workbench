#!/bin/bash
# Deploy to Production - Run this on VPS
# This script updates the VPS with the production branch

set -e

echo "=========================================="
echo "Deploying Production Branch to VPS"
echo "=========================================="
echo ""

# Navigate to project directory
cd /root/uw-workbench

# Fetch latest from remote
echo "📥 Fetching latest code..."
git fetch origin

# Switch to production branch
echo "🔄 Switching to production branch..."
git checkout production

# Pull latest changes
echo "⬇️  Pulling latest changes..."
git pull origin production

# Update application
echo "🚀 Updating application..."
./scripts/vps-update.sh

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "Your database and users are safe - only code was updated."
