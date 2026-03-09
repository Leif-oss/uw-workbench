#!/bin/bash
# Watch Mode - Auto-deploy on file changes (Development Phase)
# 
# This script watches for changes and automatically redeploys
# Usage: ./scripts/vps-watch.sh [service]
#
# Note: Requires inotify-tools: sudo apt-get install inotify-tools

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE="${1:-all}"
WATCH_DIRS=("backend" "frontend/src")

# Check if inotifywait is available
if ! command -v inotifywait &> /dev/null; then
    echo -e "${RED}❌ inotifywait not found${NC}"
    echo -e "${YELLOW}   Install with: sudo apt-get install inotify-tools${NC}"
    exit 1
fi

echo -e "${BLUE}👀 Watch Mode - Auto-deploy on changes${NC}"
echo -e "${BLUE}=====================================${NC}"
echo -e "${YELLOW}Watching: ${WATCH_DIRS[*]}${NC}"
echo -e "${YELLOW}Service: ${SERVICE}${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop${NC}"
echo ""

# Function to deploy
deploy() {
    local changed_file=$1
    echo ""
    echo -e "${BLUE}🔄 Change detected: ${changed_file}${NC}"
    echo -e "${YELLOW}   Deploying ${SERVICE}...${NC}"
    
    if [ "$SERVICE" == "all" ]; then
        # Determine which service changed
        if [[ "$changed_file" == backend/* ]]; then
            ./scripts/vps-update.sh backend
        elif [[ "$changed_file" == frontend/* ]]; then
            ./scripts/vps-update.sh frontend
        else
            ./scripts/vps-update.sh all
        fi
    else
        ./scripts/vps-update.sh "$SERVICE"
    fi
    
    echo -e "${GREEN}✅ Deployment complete${NC}"
    echo ""
}

# Watch for changes
echo -e "${GREEN}✅ Watching for changes...${NC}"
echo ""

inotifywait -m -r -e modify,create,delete,move \
    --format '%w%f' \
    "${WATCH_DIRS[@]}" 2>/dev/null | while read file; do
    # Ignore certain files
    if [[ "$file" == *".git"* ]] || \
       [[ "$file" == *"node_modules"* ]] || \
       [[ "$file" == *"__pycache__"* ]] || \
       [[ "$file" == *".pyc"* ]] || \
       [[ "$file" == *".env"* ]]; then
        continue
    fi
    
    deploy "$file"
done
