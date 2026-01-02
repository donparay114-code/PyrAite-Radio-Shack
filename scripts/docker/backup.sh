#!/bin/bash
# backup.sh - Backup database and important data
# Usage: ./backup.sh [backup_name]

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${1:-backup_$TIMESTAMP}"
DB_CONTAINER="pyrte-radio-db"
DB_USER="radio_user"
DB_NAME="radio_station"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Creating backup: $BACKUP_NAME${NC}"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup PostgreSQL database
echo "Backing up PostgreSQL database..."
docker exec $DB_CONTAINER pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/${BACKUP_NAME}_postgres.sql"

# Backup Redis data
echo "Backing up Redis data..."
docker exec pyrte-radio-redis redis-cli BGSAVE > /dev/null
sleep 2
docker cp pyrte-radio-redis:/data/dump.rdb "$BACKUP_DIR/${BACKUP_NAME}_redis.rdb" 2>/dev/null || echo "Redis backup skipped (no data)"

# Backup n8n workflows
echo "Backing up n8n workflows..."
mkdir -p "$BACKUP_DIR/${BACKUP_NAME}_n8n"
docker exec pyrte-radio-n8n n8n export:workflow --all --output=/tmp/workflows/ 2>/dev/null || true
docker cp pyrte-radio-n8n:/tmp/workflows/. "$BACKUP_DIR/${BACKUP_NAME}_n8n/" 2>/dev/null || echo "n8n workflow backup skipped"

# Create compressed archive
echo "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}_postgres.sql" "${BACKUP_NAME}_redis.rdb" "${BACKUP_NAME}_n8n" 2>/dev/null || \
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}_postgres.sql" 2>/dev/null

# Cleanup individual files
rm -f "${BACKUP_NAME}_postgres.sql" "${BACKUP_NAME}_redis.rdb"
rm -rf "${BACKUP_NAME}_n8n"

cd - > /dev/null

echo ""
echo -e "${GREEN}Backup complete: $BACKUP_DIR/${BACKUP_NAME}.tar.gz${NC}"
ls -lh "$BACKUP_DIR/${BACKUP_NAME}.tar.gz"

# Cleanup old backups (keep last 10)
echo ""
echo -e "${YELLOW}Cleaning up old backups (keeping last 10)...${NC}"
cd "$BACKUP_DIR"
ls -t *.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
cd - > /dev/null

echo -e "${GREEN}Done!${NC}"
