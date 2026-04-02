.PHONY: up down logs run run-bg stop restart status dev-logs doctor backend-test backend-lint install-hooks deps-check kg-sync kg-sync-force init-test-db builder-mocks builder-mocks-clean builder-mocks-reset progress-mocks progress-mocks-clean progress-mocks-reset literacy-demo-seed literacy-demo-clean literacy-demo-reset literacy-demo-realistic-seed literacy-demo-realistic-reset
PROJECT_ROOT := $(CURDIR)
MOCK_DB_URL ?= postgresql+psycopg://app:app@127.0.0.1:5432/app

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

run:
	./run

run-bg:
	@./scripts/dev-stack.sh start

stop:
	@./scripts/dev-stack.sh stop

restart:
	@./scripts/dev-stack.sh restart

status:
	@./scripts/dev-stack.sh status

dev-logs:
	@./scripts/dev-stack.sh logs

doctor:
	@echo "== local stack doctor =="
	@echo "[1/5] postgres container"
	@docker compose ps postgres || true
	@echo ""
	@PYTHONPATH=backend python3 scripts/doctor.py
	@echo "doctor: OK"

backend-test:
	cd backend && PYTHONPATH=. pytest

backend-lint:
	cd backend && ruff check .

init-test-db:
	cd backend && ./scripts/init-test-db.sh

builder-mocks:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/course_builder_mocks.py seed

builder-mocks-clean:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/course_builder_mocks.py cleanup

builder-mocks-reset:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/course_builder_mocks.py reset

progress-mocks:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/progress_mocks.py seed

progress-mocks-clean:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/progress_mocks.py cleanup

progress-mocks-reset:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/progress_mocks.py reset

literacy-demo-seed:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py seed

literacy-demo-clean:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py cleanup

literacy-demo-reset:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py reset

literacy-demo-realistic-seed:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py seed --profile realistic

literacy-demo-realistic-reset:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py reset --profile realistic

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
