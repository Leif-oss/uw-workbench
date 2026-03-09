#!/bin/bash
# Complete VPS Deployment Script
# Run this on your DigitalOcean Droplet after connecting via SSH
# IP: 157.245.172.164

set -e

echo "=========================================="
echo "UW Workbench - VPS Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Step 1: Update System
echo -e "${BLUE}Step 1: Updating system...${NC}"
apt update && apt upgrade -y
echo -e "${GREEN}✓ System updated${NC}"
echo ""

# Step 2: Install Docker
echo -e "${BLUE}Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi
echo ""

# Step 3: Install Docker Compose
echo -e "${BLUE}Step 3: Installing Docker Compose...${NC}"
apt install -y docker-compose-plugin
echo -e "${GREEN}✓ Docker Compose installed${NC}"
echo ""

# Step 4: Install Prerequisites
echo -e "${BLUE}Step 4: Installing prerequisites...${NC}"
apt install -y git inotify-tools curl wget
echo -e "${GREEN}✓ Prerequisites installed${NC}"
echo ""

# Step 5: Configure Firewall
echo -e "${BLUE}Step 5: Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"
echo ""

# Step 6: Verify Installations
echo -e "${BLUE}Step 6: Verifying installations...${NC}"
docker --version
docker compose version
git --version
echo -e "${GREEN}✓ All tools verified${NC}"
echo ""

echo -e "${GREEN}=========================================="
echo "✓ Server setup complete!"
echo "==========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Clone or upload your code repository"
echo "2. Configure .env file"
echo "3. Configure Caddyfile"
echo "4. Run deployment script"
echo ""
echo -e "${BLUE}Ready for code deployment!${NC}"
