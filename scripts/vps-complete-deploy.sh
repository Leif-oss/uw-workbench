#!/bin/bash
# Complete VPS Deployment Script - Run this once and it does everything
# Usage: ./scripts/vps-complete-deploy.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=========================================="
echo "UW Workbench - Complete VPS Deployment"
echo "==========================================${NC}"
echo ""

# Get IP address
IP=$(hostname -I | awk '{print $1}')
if [ -z "$IP" ]; then
    IP="157.245.172.164"
fi

echo -e "${YELLOW}Detected IP: $IP${NC}"
echo ""

# Step 1: Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${BLUE}Step 1: Creating .env file...${NC}"
    cp env.example .env
    
    # Generate a random password for PostgreSQL
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Update .env with IP-based values
    sed -i "s|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$POSTGRES_PASSWORD|" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=http://$IP|" .env
    sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=http://$IP|" .env
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=http://$IP/api|" .env
    
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠️  PostgreSQL password: $POSTGRES_PASSWORD${NC}"
    echo -e "${YELLOW}⚠️  Save this password!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
    echo ""
fi

# Step 2: Configure Caddyfile for IP access
echo -e "${BLUE}Step 2: Configuring Caddyfile...${NC}"
cat > Caddyfile << 'EOF'
:80 {
    log {
        output file /var/log/caddy/access.log
        format console
    }

    handle /api/* {
        reverse_proxy backend:8000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    handle {
        reverse_proxy frontend:3000 {
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }
}
EOF
echo -e "${GREEN}✓ Caddyfile configured${NC}"
echo ""

# Step 3: Make scripts executable
echo -e "${BLUE}Step 3: Making scripts executable...${NC}"
chmod +x scripts/*.sh 2>/dev/null || true
echo -e "${GREEN}✓ Scripts executable${NC}"
echo ""

# Step 4: Build Docker images
echo -e "${BLUE}Step 4: Building Docker images...${NC}"
echo -e "${YELLOW}   This may take 5-10 minutes...${NC}"
docker compose -f docker-compose.prod.yml build
echo -e "${GREEN}✓ Docker images built${NC}"
echo ""

# Step 5: Start services
echo -e "${BLUE}Step 5: Starting services...${NC}"
docker compose -f docker-compose.prod.yml up -d
echo -e "${GREEN}✓ Services started${NC}"
echo ""

# Step 6: Wait for services to be healthy
echo -e "${BLUE}Step 6: Waiting for services to be healthy...${NC}"
sleep 10

# Check service status
echo -e "${BLUE}Service Status:${NC}"
docker compose -f docker-compose.prod.yml ps
echo ""

# Step 7: Check backend health
echo -e "${BLUE}Step 7: Checking backend health...${NC}"
for i in {1..30}; do
    if curl -f http://localhost/api/health &> /dev/null; then
        echo -e "${GREEN}✓ Backend is healthy!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend health check failed${NC}"
        echo -e "${YELLOW}   Check logs: docker compose -f docker-compose.prod.yml logs backend${NC}"
    else
        echo -e "${YELLOW}   Waiting for backend... (attempt $i/30)${NC}"
        sleep 2
    fi
done
echo ""

# Step 8: Final status
echo -e "${GREEN}=========================================="
echo "✓ Deployment Complete!"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Access your application at:${NC}"
echo -e "${YELLOW}   http://$IP${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "   View logs: ${YELLOW}docker compose -f docker-compose.prod.yml logs -f${NC}"
echo -e "   Check status: ${YELLOW}docker compose -f docker-compose.prod.yml ps${NC}"
echo -e "   Update app: ${YELLOW}./scripts/vps-update.sh${NC}"
echo ""
echo -e "${BLUE}Next Step:${NC}"
echo -e "   Create admin user: ${YELLOW}docker exec -it uw-workbench-backend bash${NC}"
echo -e "   Then run: ${YELLOW}python -m backend.scripts.seed_data${NC}"
echo ""
