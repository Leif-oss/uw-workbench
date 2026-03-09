#!/bin/bash
# Quick VPS Update Script - Fast deployment for development phase
# 
# Usage:
#   ./scripts/vps-update.sh              # Update everything
#   ./scripts/vps-update.sh backend      # Update backend only
#   ./scripts/vps-update.sh frontend     # Update frontend only
#   ./scripts/vps-update.sh --no-cache    # Force rebuild without cache

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
SERVICE="${1:-all}"
NO_CACHE="${2:-}"

# Build args
BUILD_ARGS=""
if [ "$NO_CACHE" == "--no-cache" ]; then
    BUILD_ARGS="--no-cache"
    echo -e "${YELLOW}⚠️  Building without cache (slower but clean)${NC}"
fi

echo -e "${BLUE}🚀 UW Workbench - Quick Update${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo -e "${YELLOW}   Copy env.example to .env and configure it first${NC}"
    exit 1
fi

# Function to update service
update_service() {
    local service=$1
    echo -e "${YELLOW}📦 Updating ${service}...${NC}"
    
    if [ "$NO_CACHE" == "--no-cache" ]; then
        docker compose -f "$COMPOSE_FILE" build --no-cache "$service"
    else
        docker compose -f "$COMPOSE_FILE" build "$service"
    fi
    
    docker compose -f "$COMPOSE_FILE" up -d "$service"
    
    echo -e "${GREEN}✅ ${service} updated${NC}"
}

# Function to show logs
show_logs() {
    local service=$1
    echo -e "${BLUE}📋 Recent logs for ${service}:${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=20 "$service"
}

# Main update logic
case "$SERVICE" in
    backend)
        echo -e "${BLUE}Updating backend only...${NC}"
        update_service backend
        echo ""
        show_logs backend
        ;;
    frontend)
        echo -e "${BLUE}Updating frontend only...${NC}"
        update_service frontend
        echo ""
        show_logs frontend
        ;;
    all|*)
        echo -e "${BLUE}Updating all services...${NC}"
        
        # Update backend
        update_service backend
        echo ""
        
        # Update frontend
        update_service frontend
        echo ""
        
        # Restart caddy to pick up any config changes
        echo -e "${YELLOW}🔄 Restarting Caddy...${NC}"
        docker compose -f "$COMPOSE_FILE" restart caddy
        echo -e "${GREEN}✅ Caddy restarted${NC}"
        echo ""
        
        # Show status
        echo -e "${BLUE}📊 Service Status:${NC}"
        docker compose -f "$COMPOSE_FILE" ps
        echo ""
        
        # Show recent logs
        echo -e "${BLUE}📋 Recent Backend Logs:${NC}"
        docker compose -f "$COMPOSE_FILE" logs --tail=10 backend
        echo ""
        echo -e "${BLUE}📋 Recent Frontend Logs:${NC}"
        docker compose -f "$COMPOSE_FILE" logs --tail=10 frontend
        ;;
esac

echo ""
echo -e "${GREEN}✅ Update complete!${NC}"
echo ""
echo -e "${BLUE}💡 Tips:${NC}"
echo -e "   - View all logs: ${YELLOW}docker compose -f $COMPOSE_FILE logs -f${NC}"
echo -e "   - Check status: ${YELLOW}docker compose -f $COMPOSE_FILE ps${NC}"
echo -e "   - Restart service: ${YELLOW}docker compose -f $COMPOSE_FILE restart <service>${NC}"
