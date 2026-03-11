#!/bin/bash
# PostgreSQL Restore Script for VPS (Docker)
# 
# Usage:
#   ./scripts/vps-restore-database.sh <backup_file>
#   ./scripts/vps-restore-database.sh backups/uw_workbench_backup_20240310_120000.sql.gz
#
# WARNING: This will REPLACE all current data in the database!
# Always backup before restoring!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [ $# -eq 0 ]; then
    echo -e "${RED}✗ Error: Backup file required${NC}"
    echo ""
    echo "Usage: $0 <backup_file>"
    echo "Example: $0 backups/uw_workbench_backup_20240310_120000.sql.gz"
    echo ""
    echo "Available backups:"
    ls -lh backups/uw_workbench_backup_*.sql.gz 2>/dev/null | awk '{print "  " $9, "(" $5 ")"}'
    exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}✗ Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

# Check if postgres container is running
if ! docker ps | grep -q uw-workbench-postgres; then
    echo -e "${RED}✗ Error: PostgreSQL container 'uw-workbench-postgres' is not running${NC}"
    exit 1
fi

# Get database credentials
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

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}Database Restore Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${RED}⚠ WARNING: This will REPLACE all current data!${NC}"
echo -e "  Database: ${PGDATABASE}"
echo -e "  Backup: ${BACKUP_FILE}"
echo ""
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Creating safety backup before restore...${NC}"
SAFETY_BACKUP="./backups/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz"
docker exec -e PGPASSWORD="$PGPASSWORD" uw-workbench-postgres \
    pg_dump -U "$PGUSER" -d "$PGDATABASE" -F p | gzip > "$SAFETY_BACKUP"
echo -e "${GREEN}✓ Safety backup created: ${SAFETY_BACKUP}${NC}"
echo ""

# Determine if file is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo -e "${YELLOW}Decompressing backup...${NC}"
    TEMP_FILE="/tmp/restore_$(date +%s).sql"
    gunzip -c "$BACKUP_FILE" > "$TEMP_FILE"
    RESTORE_FILE="$TEMP_FILE"
else
    RESTORE_FILE="$BACKUP_FILE"
fi

echo -e "${YELLOW}Restoring database...${NC}"
echo -e "  This may take a few minutes..."
echo ""

# Copy file into container and restore
CONTAINER_TEMP="/tmp/restore.sql"
docker cp "$RESTORE_FILE" uw-workbench-postgres:"$CONTAINER_TEMP"

if docker exec -e PGPASSWORD="$PGPASSWORD" uw-workbench-postgres \
    psql -U "$PGUSER" -d "$PGDATABASE" -f "$CONTAINER_TEMP" > /dev/null 2>&1; then
    
    # Clean up
    docker exec uw-workbench-postgres rm -f "$CONTAINER_TEMP"
    if [ -n "$TEMP_FILE" ]; then
        rm -f "$TEMP_FILE"
    fi
    
    echo -e "${GREEN}✓ Database restored successfully!${NC}"
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    echo -e "  1. Verify the data in the application"
    echo -e "  2. Restart the backend if needed:"
    echo -e "     docker compose -f docker-compose.prod.yml restart backend"
    echo ""
else
    echo -e "${RED}✗ Error: Restore failed${NC}"
    echo -e "${YELLOW}Safety backup available at: ${SAFETY_BACKUP}${NC}"
    
    # Clean up
    docker exec uw-workbench-postgres rm -f "$CONTAINER_TEMP" 2>/dev/null || true
    if [ -n "$TEMP_FILE" ]; then
        rm -f "$TEMP_FILE"
    fi
    
    exit 1
fi
