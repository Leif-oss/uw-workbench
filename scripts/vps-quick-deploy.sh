#!/bin/bash
# Quick VPS Initial Deployment Script
# 
# This script sets up the VPS environment and deploys the application
# Usage: ./scripts/vps-quick-deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 UW Workbench - Quick VPS Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -eq 0 ]; then 
    echo -e "${YELLOW}⚠️  Running as root. Consider using a non-root user with sudo.${NC}"
fi

# Step 1: Check prerequisites
echo -e "${BLUE}📋 Step 1: Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}⚠️  Please log out and back in for Docker group changes to take effect${NC}"
    echo -e "${YELLOW}   Or run: newgrp docker${NC}"
    exit 1
fi

# Check Docker Compose
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

echo -e "${GREEN}✅ Docker: $(docker --version)${NC}"
echo -e "${GREEN}✅ Docker Compose: $(docker compose version)${NC}"
echo ""

# Step 2: Configure environment
echo -e "${BLUE}📋 Step 2: Configuring environment...${NC}"

if [ ! -f .env ]; then
    if [ -f env.example ]; then
        echo -e "${YELLOW}📝 Creating .env from env.example...${NC}"
        cp env.example .env
        echo -e "${YELLOW}⚠️  Please edit .env with your actual values before continuing${NC}"
        echo -e "${YELLOW}   Run: nano .env${NC}"
        read -p "Press Enter after editing .env..."
    else
        echo -e "${RED}❌ env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Step 3: Configure Caddyfile
echo -e "${BLUE}📋 Step 3: Configuring Caddyfile...${NC}"

if [ -f Caddyfile ]; then
    echo -e "${YELLOW}⚠️  Please verify Caddyfile has your domain configured${NC}"
    echo -e "${YELLOW}   Current Caddyfile:${NC}"
    head -n 15 Caddyfile | grep -v "^#" | grep -v "^$" || echo "   (check Caddyfile)"
    echo ""
    read -p "Press Enter to continue (or Ctrl+C to edit Caddyfile first)..."
else
    echo -e "${RED}❌ Caddyfile not found${NC}"
    exit 1
fi

# Step 4: Create backup directory
echo -e "${BLUE}📋 Step 4: Creating backup directory...${NC}"
mkdir -p backups
chmod 755 backups
echo -e "${GREEN}✅ Backup directory created${NC}"
echo ""

# Step 5: Build and start services
echo -e "${BLUE}📋 Step 5: Building and starting services...${NC}"
echo -e "${YELLOW}   This may take 5-10 minutes on first run...${NC}"
echo ""

docker compose -f docker-compose.prod.yml build

echo ""
echo -e "${BLUE}📋 Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d

echo ""
echo -e "${GREEN}✅ Services started!${NC}"
echo ""

# Step 6: Wait for services to be healthy
echo -e "${BLUE}📋 Step 6: Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo -e "${BLUE}📊 Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${BLUE}📋 Checking backend health...${NC}"
for i in {1..30}; do
    if curl -f http://localhost/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Backend is healthy!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ Backend health check failed after 30 attempts${NC}"
        echo -e "${YELLOW}   Check logs: docker compose -f docker-compose.prod.yml logs backend${NC}"
    else
        echo -e "${YELLOW}   Waiting for backend... (attempt $i/30)${NC}"
        sleep 2
    fi
done

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo -e "   1. Create initial admin user (see VPS_DEPLOYMENT.md)"
echo -e "   2. Access your app at:"
echo -e "      - With domain: ${YELLOW}https://your-domain.com${NC}"
echo -e "      - With IP: ${YELLOW}http://$(hostname -I | awk '{print $1}')${NC}"
echo ""
echo -e "${BLUE}💡 Useful Commands:${NC}"
echo -e "   - View logs: ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "   - Update app: ${YELLOW}./scripts/vps-update.sh${NC}"
echo -e "   - Stop services: ${YELLOW}docker compose -f docker-compose.prod.yml down${NC}"
echo -e "   - Restart services: ${YELLOW}docker compose -f docker-compose.prod.yml restart${NC}"
