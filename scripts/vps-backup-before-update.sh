#!/bin/bash
# Pre-Update Backup Script for VPS
# 
# This script creates a backup before updating the application.
# It should be run before any deployment/update.
#
# Usage:
#   ./scripts/vps-backup-before-update.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "========================================"
echo "Pre-Update Backup"
echo "========================================"
echo ""
echo "This will create a backup before updating the application."
echo ""

# Run the backup script with a descriptive message
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
"$SCRIPT_DIR/vps-backup-database.sh" "Pre-update backup - $TIMESTAMP"

echo ""
echo "✅ Backup completed. Safe to proceed with update."
echo ""
echo "Next steps:"
echo "  1. Review the backup file above"
echo "  2. Proceed with git pull and docker compose update"
echo ""
