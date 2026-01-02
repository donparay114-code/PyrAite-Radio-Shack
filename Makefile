# PYrte Radio Shack - Docker Toolkit Makefile
# Run 'make help' to see available commands

.PHONY: help build up down restart logs shell test clean prune \
        dev prod migrate seed db-shell redis-cli n8n-logs \
        build-prod deploy health backup restore

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[34m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
NC := \033[0m

# Docker compose files
COMPOSE_DEV := docker-compose.yml
COMPOSE_PROD := docker-compose.prod.yml

# Container names
API_CONTAINER := pyrte-radio-api
DB_CONTAINER := pyrte-radio-db
REDIS_CONTAINER := pyrte-radio-redis
N8N_CONTAINER := pyrte-radio-n8n

#==============================================================================
# HELP
#==============================================================================
help: ## Show this help message
	@echo "$(BLUE)PYrte Radio Shack - Docker Toolkit$(NC)"
	@echo ""
	@echo "$(GREEN)Usage:$(NC) make [target]"
	@echo ""
	@echo "$(YELLOW)Development:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(dev|up|down|restart|logs|shell|test)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Production:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(prod|deploy|build-prod)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Database:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(migrate|seed|db-|backup|restore)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(YELLOW)Utilities:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | grep -E '(clean|prune|health|redis|n8n)' | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'

#==============================================================================
# DEVELOPMENT
#==============================================================================
dev: ## Start development environment (alias for 'up')
	@$(MAKE) up

up: ## Start all development containers
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker compose -f $(COMPOSE_DEV) up -d
	@echo "$(GREEN)Services started!$(NC)"
	@$(MAKE) urls

down: ## Stop all containers
	@echo "$(YELLOW)Stopping containers...$(NC)"
	docker compose -f $(COMPOSE_DEV) down
	@echo "$(GREEN)Containers stopped.$(NC)"

restart: ## Restart all containers
	@echo "$(YELLOW)Restarting containers...$(NC)"
	docker compose -f $(COMPOSE_DEV) restart
	@echo "$(GREEN)Containers restarted.$(NC)"

restart-api: ## Restart only the API container
	@echo "$(YELLOW)Restarting API container...$(NC)"
	docker compose -f $(COMPOSE_DEV) restart api
	@echo "$(GREEN)API restarted.$(NC)"

logs: ## Follow logs from all containers
	docker compose -f $(COMPOSE_DEV) logs -f

logs-api: ## Follow API container logs
	docker compose -f $(COMPOSE_DEV) logs -f api

logs-db: ## Follow database container logs
	docker compose -f $(COMPOSE_DEV) logs -f db

shell: ## Open shell in API container
	docker exec -it $(API_CONTAINER) /bin/bash

shell-root: ## Open root shell in API container
	docker exec -it -u root $(API_CONTAINER) /bin/bash

test: ## Run tests in container
	@echo "$(GREEN)Running tests...$(NC)"
	docker compose -f $(COMPOSE_DEV) exec api pytest -v

test-cov: ## Run tests with coverage
	@echo "$(GREEN)Running tests with coverage...$(NC)"
	docker compose -f $(COMPOSE_DEV) exec api pytest --cov=src --cov-report=html

#==============================================================================
# PRODUCTION
#==============================================================================
prod: ## Start production environment
	@echo "$(GREEN)Starting production environment...$(NC)"
	docker compose -f $(COMPOSE_PROD) up -d
	@echo "$(GREEN)Production services started!$(NC)"

prod-down: ## Stop production environment
	@echo "$(YELLOW)Stopping production containers...$(NC)"
	docker compose -f $(COMPOSE_PROD) down
	@echo "$(GREEN)Production containers stopped.$(NC)"

build-prod: ## Build production images
	@echo "$(GREEN)Building production images...$(NC)"
	docker compose -f $(COMPOSE_PROD) build --no-cache
	@echo "$(GREEN)Production images built.$(NC)"

deploy: ## Deploy to production (build and start)
	@echo "$(GREEN)Deploying to production...$(NC)"
	@$(MAKE) build-prod
	@$(MAKE) prod
	@echo "$(GREEN)Deployment complete!$(NC)"

#==============================================================================
# BUILD
#==============================================================================
build: ## Build development images
	@echo "$(GREEN)Building development images...$(NC)"
	docker compose -f $(COMPOSE_DEV) build
	@echo "$(GREEN)Build complete.$(NC)"

build-no-cache: ## Build images without cache
	@echo "$(GREEN)Building images (no cache)...$(NC)"
	docker compose -f $(COMPOSE_DEV) build --no-cache
	@echo "$(GREEN)Build complete.$(NC)"

pull: ## Pull latest images
	@echo "$(GREEN)Pulling latest images...$(NC)"
	docker compose -f $(COMPOSE_DEV) pull
	@echo "$(GREEN)Images updated.$(NC)"

#==============================================================================
# DATABASE
#==============================================================================
migrate: ## Run database migrations
	@echo "$(GREEN)Running migrations...$(NC)"
	docker compose -f $(COMPOSE_DEV) --profile setup up migrate
	@echo "$(GREEN)Migrations complete.$(NC)"

seed: ## Seed database with initial data
	@echo "$(GREEN)Seeding database...$(NC)"
	docker compose -f $(COMPOSE_DEV) exec api python scripts/seed_data.py
	@echo "$(GREEN)Seeding complete.$(NC)"

db-shell: ## Open PostgreSQL shell
	docker exec -it $(DB_CONTAINER) psql -U radio_user -d radio_station

db-dump: ## Dump database to backup file
	@echo "$(GREEN)Creating database backup...$(NC)"
	@mkdir -p backups
	docker exec $(DB_CONTAINER) pg_dump -U radio_user radio_station > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created in backups/ directory.$(NC)"

db-restore: ## Restore database from backup (usage: make db-restore FILE=backups/backup.sql)
	@if [ -z "$(FILE)" ]; then echo "$(RED)Usage: make db-restore FILE=backups/backup.sql$(NC)"; exit 1; fi
	@echo "$(YELLOW)Restoring database from $(FILE)...$(NC)"
	docker exec -i $(DB_CONTAINER) psql -U radio_user -d radio_station < $(FILE)
	@echo "$(GREEN)Database restored.$(NC)"

#==============================================================================
# REDIS
#==============================================================================
redis-cli: ## Open Redis CLI
	docker exec -it $(REDIS_CONTAINER) redis-cli

redis-flush: ## Flush all Redis data (use with caution!)
	@echo "$(RED)WARNING: This will delete all Redis data!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] && \
		docker exec $(REDIS_CONTAINER) redis-cli FLUSHALL || echo "Cancelled."

redis-stats: ## Show Redis memory stats
	docker exec $(REDIS_CONTAINER) redis-cli INFO memory

#==============================================================================
# N8N
#==============================================================================
n8n-logs: ## Follow n8n container logs
	docker compose -f $(COMPOSE_DEV) logs -f n8n

n8n-shell: ## Open shell in n8n container
	docker exec -it $(N8N_CONTAINER) /bin/sh

n8n-export: ## Export n8n workflows
	@echo "$(GREEN)Exporting n8n workflows...$(NC)"
	@mkdir -p n8n_exports
	docker exec $(N8N_CONTAINER) n8n export:workflow --all --output=/home/node/workflows/
	@echo "$(GREEN)Workflows exported to n8n_workflows/ directory.$(NC)"

#==============================================================================
# STREAMING (Optional profile)
#==============================================================================
streaming-up: ## Start streaming services (Icecast)
	@echo "$(GREEN)Starting streaming services...$(NC)"
	docker compose -f $(COMPOSE_DEV) --profile streaming up -d
	@echo "$(GREEN)Streaming services started!$(NC)"

streaming-down: ## Stop streaming services
	docker compose -f $(COMPOSE_DEV) --profile streaming down

#==============================================================================
# HEALTH & STATUS
#==============================================================================
health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(YELLOW)API:$(NC)"
	@curl -sf http://localhost:8000/health && echo " $(GREEN)OK$(NC)" || echo " $(RED)FAIL$(NC)"
	@echo ""
	@echo "$(YELLOW)n8n:$(NC)"
	@curl -sf http://localhost:5678/healthz && echo " $(GREEN)OK$(NC)" || echo " $(RED)FAIL$(NC)"
	@echo ""
	@echo "$(YELLOW)PostgreSQL:$(NC)"
	@docker exec $(DB_CONTAINER) pg_isready -U radio_user && echo "$(GREEN)OK$(NC)" || echo "$(RED)FAIL$(NC)"
	@echo ""
	@echo "$(YELLOW)Redis:$(NC)"
	@docker exec $(REDIS_CONTAINER) redis-cli ping && echo "$(GREEN)OK$(NC)" || echo "$(RED)FAIL$(NC)"

status: ## Show container status
	@echo "$(BLUE)Container Status:$(NC)"
	docker compose -f $(COMPOSE_DEV) ps

urls: ## Show service URLs
	@echo ""
	@echo "$(BLUE)Service URLs:$(NC)"
	@echo "  $(GREEN)API:$(NC)      http://localhost:8000"
	@echo "  $(GREEN)API Docs:$(NC) http://localhost:8000/docs"
	@echo "  $(GREEN)n8n:$(NC)      http://localhost:5678"
	@echo "  $(GREEN)pgAdmin:$(NC)  http://localhost:5050 (if running)"
	@echo "  $(GREEN)Redis:$(NC)    localhost:6379"
	@echo ""

#==============================================================================
# CLEANUP
#==============================================================================
clean: ## Remove stopped containers and unused images
	@echo "$(YELLOW)Cleaning up...$(NC)"
	docker compose -f $(COMPOSE_DEV) down --remove-orphans
	docker image prune -f
	@echo "$(GREEN)Cleanup complete.$(NC)"

clean-volumes: ## Remove all volumes (WARNING: deletes data!)
	@echo "$(RED)WARNING: This will delete all Docker volumes and data!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] && \
		docker compose -f $(COMPOSE_DEV) down -v || echo "Cancelled."

prune: ## Deep clean Docker system (use with caution!)
	@echo "$(RED)WARNING: This will remove all unused Docker resources!$(NC)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ] && \
		docker system prune -af --volumes || echo "Cancelled."

#==============================================================================
# DEVELOPMENT UTILITIES
#==============================================================================
lint: ## Run linting in container
	docker compose -f $(COMPOSE_DEV) exec api ruff check src/

format: ## Format code in container
	docker compose -f $(COMPOSE_DEV) exec api black src/ tests/

typecheck: ## Run type checking
	docker compose -f $(COMPOSE_DEV) exec api mypy src/

#==============================================================================
# QUICK START
#==============================================================================
init: ## Initialize project (first-time setup)
	@echo "$(BLUE)Initializing PYrte Radio Shack...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file from .env.example$(NC)"; \
		echo "$(YELLOW)Please edit .env with your configuration before continuing$(NC)"; \
	fi
	@$(MAKE) build
	@$(MAKE) up
	@echo "$(YELLOW)Waiting for services to start...$(NC)"
	@sleep 10
	@$(MAKE) migrate
	@echo ""
	@echo "$(GREEN)Initialization complete!$(NC)"
	@$(MAKE) urls
