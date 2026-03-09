#!/bin/bash
# PostgreSQL Backup Script for UW Workbench
# 
# Usage:
#   ./scripts/backup-database.sh
#   ./scripts/backup-database.sh /custom/backup/path
#
# This script creates a timestamped backup of the PostgreSQL database
# and optionally manages backup retention.

set -e

# Configuration
BACKUP_DIR="${1:-./backups}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}  # Keep backups for 30 days by default
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/uw_workbench_backup_${TIMESTAMP}.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running inside Docker or on host
if [ -f /.dockerenv ]; then
    # Running inside Docker container
    echo -e "${YELLOW}Running backup from inside Docker container${NC}"
    PGHOST="${POSTGRES_HOST:-postgres}"
    PGPORT="${POSTGRES_PORT:-5432}"
    PGUSER="${POSTGRES_USER:-uw_workbench}"
    PGDATABASE="${POSTGRES_DB:-uw_workbench}"
    PGPASSWORD="${POSTGRES_PASSWORD}"
else
    # Running on host - use docker exec
    echo -e "${YELLOW}Running backup from host using docker exec${NC}"
    
    # Check if postgres container is running
    if ! docker ps | grep -q uw-workbench-postgres; then
        echo -e "${RED}Error: PostgreSQL container 'uw-workbench-postgres' is not running${NC}"
        exit 1
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Get database credentials from docker-compose
    PGHOST="localhost"
    PGPORT="5432"
    PGUSER="${POSTGRES_USER:-uw_workbench}"
    PGDATABASE="${POSTGRES_DB:-uw_workbench}"
    
    # Try to get password from .env file
    if [ -f .env ]; then
        PGPASSWORD=$(grep "^POSTGRES_PASSWORD=" .env | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    else
        echo -e "${RED}Error: .env file not found. Cannot determine database password.${NC}"
        exit 1
    fi
    
    # Run backup via docker exec
    echo -e "${GREEN}Creating backup: ${BACKUP_FILE}${NC}"
    docker exec -e PGPASSWORD="$PGPASSWORD" uw-workbench-postgres \
        pg_dump -U "$PGUSER" -d "$PGDATABASE" -F p > "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup created successfully: ${BACKUP_FILE}${NC}"
        
        # Compress backup
        echo -e "${YELLOW}Compressing backup...${NC}"
        gzip "$BACKUP_FILE"
        BACKUP_FILE="${BACKUP_FILE}.gz"
        echo -e "${GREEN}✓ Backup compressed: ${BACKUP_FILE}${NC}"
        
        # Get file size
        FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "${GREEN}Backup size: ${FILE_SIZE}${NC}"
    else
        echo -e "${RED}✗ Backup failed${NC}"
        exit 1
    fi
fi

# Cleanup old backups (if running on host)
if [ ! -f /.dockerenv ] && [ -n "$RETENTION_DAYS" ]; then
    echo -e "${YELLOW}Cleaning up backups older than ${RETENTION_DAYS} days...${NC}"
    find "$BACKUP_DIR" -name "uw_workbench_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    OLD_COUNT=$(find "$BACKUP_DIR" -name "uw_workbench_backup_*.sql.gz" -type f | wc -l)
    echo -e "${GREEN}✓ Cleanup complete. ${OLD_COUNT} backup(s) retained.${NC}"
fi

echo -e "${GREEN}Backup process completed successfully!${NC}"
