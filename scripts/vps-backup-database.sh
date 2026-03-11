#!/bin/bash
# PostgreSQL Backup Script for VPS (Docker)
# 
# Usage:
#   ./scripts/vps-backup-database.sh
#   ./scripts/vps-backup-database.sh [description]
#
# This script creates a timestamped backup of the PostgreSQL database
# from the Docker container and saves it to the ./backups directory.

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DESCRIPTION="${1:-Manual backup}"
BACKUP_FILE="${BACKUP_DIR}/uw_workbench_backup_${TIMESTAMP}.sql"
COMPRESSED_FILE="${BACKUP_FILE}.gz"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Database Backup Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Check if postgres container is running
if ! docker ps | grep -q uw-workbench-postgres; then
    echo -e "${RED}✗ Error: PostgreSQL container 'uw-workbench-postgres' is not running${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database credentials from environment or docker-compose
if [ -f .env ]; then
    source .env
    PGPASSWORD="${POSTGRES_PASSWORD}"
    PGUSER="${POSTGRES_USER:-uw_workbench}"
    PGDATABASE="${POSTGRES_DB:-uw_workbench}"
else
    echo -e "${YELLOW}⚠ Warning: .env file not found. Using defaults.${NC}"
    PGPASSWORD="${POSTGRES_PASSWORD:-}"
    PGUSER="${POSTGRES_USER:-uw_workbench}"
    PGDATABASE="${POSTGRES_DB:-uw_workbench}"
fi

if [ -z "$PGPASSWORD" ]; then
    echo -e "${RED}✗ Error: POSTGRES_PASSWORD not set in environment${NC}"
    exit 1
fi

echo -e "${YELLOW}Creating backup...${NC}"
echo -e "  Description: ${DESCRIPTION}${NC}"
echo -e "  Timestamp: ${TIMESTAMP}${NC}"
echo ""

# Run backup via docker exec
echo -e "${YELLOW}Running pg_dump...${NC}"
if docker exec -e PGPASSWORD="$PGPASSWORD" uw-workbench-postgres \
    pg_dump -U "$PGUSER" -d "$PGDATABASE" -F p --clean --if-exists > "$BACKUP_FILE" 2>&1; then
    
    # Check if backup file was created and has content
    if [ ! -s "$BACKUP_FILE" ]; then
        echo -e "${RED}✗ Error: Backup file is empty${NC}"
        rm -f "$BACKUP_FILE"
        exit 1
    fi
    
    echo -e "${GREEN}✓ Backup created: ${BACKUP_FILE}${NC}"
    
    # Compress backup
    echo -e "${YELLOW}Compressing backup...${NC}"
    if gzip "$BACKUP_FILE"; then
        echo -e "${GREEN}✓ Backup compressed: ${COMPRESSED_FILE}${NC}"
        
        # Get file size
        FILE_SIZE=$(du -h "$COMPRESSED_FILE" | cut -f1)
        echo -e "${GREEN}Backup size: ${FILE_SIZE}${NC}"
        
        # Create a metadata file
        METADATA_FILE="${BACKUP_DIR}/uw_workbench_backup_${TIMESTAMP}.meta"
        cat > "$METADATA_FILE" <<EOF
Backup Timestamp: ${TIMESTAMP}
Created: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Description: ${DESCRIPTION}
Database: ${PGDATABASE}
User: ${PGUSER}
File: ${COMPRESSED_FILE}
Size: ${FILE_SIZE}
EOF
        echo -e "${GREEN}✓ Metadata saved: ${METADATA_FILE}${NC}"
        
    else
        echo -e "${RED}✗ Error: Failed to compress backup${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Error: Backup failed${NC}"
    exit 1
fi

# List recent backups
echo ""
echo -e "${CYAN}Recent backups:${NC}"
ls -lh "$BACKUP_DIR"/uw_workbench_backup_*.sql.gz 2>/dev/null | tail -5 | awk '{print $9, "(" $5 ")"}'

BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/uw_workbench_backup_*.sql.gz 2>/dev/null | wc -l)
echo -e "${CYAN}Total backups: ${BACKUP_COUNT}${NC}"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${YELLOW}Backup location:${NC}"
echo -e "  ${COMPRESSED_FILE}"
echo ""
echo -e "${YELLOW}To download backup to local machine:${NC}"
echo -e "  scp root@157.245.172.164:${COMPRESSED_FILE} ./"
echo ""
