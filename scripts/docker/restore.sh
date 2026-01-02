#!/bin/bash
# restore.sh - Restore database and data from backup
# Usage: ./restore.sh backup_file.tar.gz

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh ./backups/*.tar.gz 2>/dev/null || echo "No backups found in ./backups/"
    exit 1
fi

BACKUP_FILE="$1"
DB_CONTAINER="pyrte-radio-db"
DB_USER="radio_user"
DB_NAME="radio_station"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}WARNING: This will restore from backup and overwrite existing data!${NC}"
read -p "Are you sure you want to continue? [y/N] " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "Restore cancelled."
    exit 0
fi

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the PostgreSQL backup file
PG_BACKUP=$(find "$TEMP_DIR" -name "*_postgres.sql" | head -1)

if [ -n "$PG_BACKUP" ]; then
    echo "Restoring PostgreSQL database..."

    # Drop and recreate database
    docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;"
    docker exec $DB_CONTAINER psql -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

    # Restore data
    cat "$PG_BACKUP" | docker exec -i $DB_CONTAINER psql -U $DB_USER -d $DB_NAME

    echo -e "${GREEN}PostgreSQL restored successfully!${NC}"
else
    echo -e "${YELLOW}No PostgreSQL backup found in archive${NC}"
fi

# Restore Redis if backup exists
REDIS_BACKUP=$(find "$TEMP_DIR" -name "*_redis.rdb" | head -1)

if [ -n "$REDIS_BACKUP" ] && [ -f "$REDIS_BACKUP" ]; then
    echo "Restoring Redis data..."
    docker cp "$REDIS_BACKUP" pyrte-radio-redis:/data/dump.rdb
    docker restart pyrte-radio-redis
    echo -e "${GREEN}Redis restored successfully!${NC}"
else
    echo -e "${YELLOW}No Redis backup found in archive${NC}"
fi

# Restore n8n workflows if backup exists
N8N_BACKUP=$(find "$TEMP_DIR" -type d -name "*_n8n" | head -1)

if [ -n "$N8N_BACKUP" ] && [ -d "$N8N_BACKUP" ]; then
    echo "Restoring n8n workflows..."
    docker cp "$N8N_BACKUP/." pyrte-radio-n8n:/home/node/.n8n/workflows/
    echo -e "${GREEN}n8n workflows restored!${NC}"
    echo -e "${YELLOW}Note: You may need to import workflows manually through n8n UI${NC}"
else
    echo -e "${YELLOW}No n8n workflow backup found in archive${NC}"
fi

echo ""
echo -e "${GREEN}Restore complete!${NC}"
