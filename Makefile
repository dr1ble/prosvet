.PHONY: up down logs run backend-test backend-lint install-hooks deps-check kg-sync kg-sync-force init-test-db
PROJECT_ROOT := $(CURDIR)

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

run:
	./run

backend-test:
	cd backend && PYTHONPATH=. pytest

backend-lint:
	cd backend && ruff check .

init-test-db:
	cd backend && ./scripts/init-test-db.sh

install-hooks:
	./scripts/install-git-hooks.sh

deps-check:
	@echo "== web: npm outdated =="
	@cd web && npm outdated || true
	@echo ""
	@echo "== backend: pip dry-run upgrade check =="
	@python3 -m pip install --dry-run --upgrade -r backend/requirements-dev.txt || true
	@echo ""
	@echo "== mobile: managed by Dependabot (gradle) + manual Gradle checks =="

kg-sync:
	@python3 scripts/seed_kg_memory.py --project-root "$(PROJECT_ROOT)" --memory-file .context/operations/kg_memory.jsonl --replace

kg-sync-force: kg-sync
