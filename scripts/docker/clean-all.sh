#!/bin/bash
# clean-all.sh - Clean up all Docker resources for this project
# Usage: ./clean-all.sh [--volumes] [--force]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REMOVE_VOLUMES=false
FORCE=false

# Parse arguments
for arg in "$@"; do
    case $arg in
        --volumes)
            REMOVE_VOLUMES=true
            ;;
        --force)
            FORCE=true
            ;;
        *)
            echo "Usage: $0 [--volumes] [--force]"
            echo "  --volumes  Also remove data volumes"
            echo "  --force    Skip confirmation prompts"
            exit 1
            ;;
    esac
done

echo -e "${YELLOW}This will clean up all PYrte Radio Shack Docker resources.${NC}"

if [ "$REMOVE_VOLUMES" = true ]; then
    echo -e "${RED}WARNING: --volumes flag set. This will DELETE ALL DATA!${NC}"
fi

if [ "$FORCE" = false ]; then
    read -p "Continue? [y/N] " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo ""
echo "Stopping containers..."
docker compose down --remove-orphans 2>/dev/null || true

if [ "$REMOVE_VOLUMES" = true ]; then
    echo "Removing volumes..."
    docker compose down -v 2>/dev/null || true

    # Remove named volumes
    docker volume ls -q | grep "pyrte" | xargs -r docker volume rm 2>/dev/null || true
fi

echo "Removing project images..."
docker images | grep "pyrte-radio" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true

echo "Removing dangling images..."
docker image prune -f

echo "Removing unused networks..."
docker network prune -f

echo ""
echo -e "${GREEN}Cleanup complete!${NC}"

# Show remaining resources
echo ""
echo "Remaining Docker resources:"
docker ps -a --format "table {{.Names}}\t{{.Status}}" | grep pyrte || echo "  No containers"
docker volume ls | grep pyrte || echo "  No volumes"
docker images | grep pyrte || echo "  No images"
