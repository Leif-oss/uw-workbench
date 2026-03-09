#!/bin/bash
# Setup Automated Backups for UW Workbench
# 
# This script sets up a cron job to automatically backup the database
# Usage: ./scripts/setup-automated-backups.sh [backup_directory] [retention_days] [schedule]
#
# Examples:
#   ./scripts/setup-automated-backups.sh                    # Default: daily at 2 AM, keep 30 days
#   ./scripts/setup-automated-backups.sh /backups 60        # Keep 60 days
#   ./scripts/setup-automated-backups.sh /backups 30 "0 3 * * *"  # Daily at 3 AM

set -e

# Configuration
BACKUP_DIR="${1:-/root/uw-workbench/backups}"
RETENTION_DAYS="${2:-30}"
CRON_SCHEDULE="${3:-0 2 * * *}"  # Default: Daily at 2 AM

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up automated backups for UW Workbench${NC}"
echo -e "${YELLOW}Backup directory: ${BACKUP_DIR}${NC}"
echo -e "${YELLOW}Retention: ${RETENTION_DAYS} days${NC}"
echo -e "${YELLOW}Schedule: ${CRON_SCHEDULE}${NC}"

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-database.sh"

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}Error: Backup script not found at ${BACKUP_SCRIPT}${NC}"
    exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"
echo -e "${GREEN}✓ Backup directory created/verified: ${BACKUP_DIR}${NC}"

# Create a wrapper script that will be called by cron
WRAPPER_SCRIPT="${PROJECT_ROOT}/scripts/backup-cron-wrapper.sh"
cat > "$WRAPPER_SCRIPT" << EOF
#!/bin/bash
# Wrapper script for cron backup
# This ensures environment variables are set correctly

cd "${PROJECT_ROOT}"
export BACKUP_RETENTION_DAYS=${RETENTION_DAYS}
"${BACKUP_SCRIPT}" "${BACKUP_DIR}" >> "${BACKUP_DIR}/backup.log" 2>&1
EOF

chmod +x "$WRAPPER_SCRIPT"
echo -e "${GREEN}✓ Created cron wrapper script${NC}"

# Remove existing cron job if it exists
crontab -l 2>/dev/null | grep -v "backup-cron-wrapper.sh" | crontab - 2>/dev/null || true

# Add new cron job
(crontab -l 2>/dev/null; echo "${CRON_SCHEDULE} ${WRAPPER_SCRIPT}") | crontab -

echo -e "${GREEN}✓ Cron job added${NC}"
echo ""
echo -e "${GREEN}Automated backup setup complete!${NC}"
echo ""
echo -e "${YELLOW}Current cron jobs:${NC}"
crontab -l | grep -E "(backup|BACKUP)" || echo "  (none found)"
echo ""
echo -e "${YELLOW}To view backup logs:${NC}"
echo "  tail -f ${BACKUP_DIR}/backup.log"
echo ""
echo -e "${YELLOW}To manually run a backup:${NC}"
echo "  ${BACKUP_SCRIPT} ${BACKUP_DIR}"
echo ""
echo -e "${YELLOW}To remove automated backups:${NC}"
echo "  crontab -e  # Then remove the backup line"
