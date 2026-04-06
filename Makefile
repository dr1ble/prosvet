.PHONY: up down logs run run-bg stop restart status dev-logs doctor backend-test backend-lint install-hooks deps-check mobile-theme-guard kg-sync kg-sync-force init-test-db builder-mocks builder-mocks-clean builder-mocks-reset progress-mocks progress-mocks-clean progress-mocks-reset literacy-demo-seed literacy-demo-clean literacy-demo-reset literacy-demo-realistic-seed literacy-demo-realistic-reset mobile-runtime-seed mobile-runtime-clean mobile-runtime-reset mobile-runtime-verify mobile-runtime-heavy-seed mobile-runtime-heavy-reset mobile-runtime-heavy-verify
PROJECT_ROOT := $(CURDIR)
MOCK_DB_URL ?= postgresql+psycopg://app:app@127.0.0.1:5432/app

# Safety guard for destructive seed reset targets.
# Usage:
#   ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make builder-mocks-reset
ALLOW_DATA_RESET ?= 0
CONFIRM_DATA_RESET ?=

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
	@DOCKER_ENSURE_PREFIX='[doctor]' DOCKER_STARTUP_TIMEOUT=$${DOCKER_STARTUP_TIMEOUT:-90} ./scripts/ensure-docker.sh
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
	@if [ "$(ALLOW_DATA_RESET)" != "1" ] || [ "$(CONFIRM_DATA_RESET)" != "YES_I_UNDERSTAND_DATA_LOSS" ]; then echo "[protect] Destructive reset blocked. Use: ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make builder-mocks-reset"; exit 1; fi
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/course_builder_mocks.py reset

progress-mocks-reset:
	@if [ "$(ALLOW_DATA_RESET)" != "1" ] || [ "$(CONFIRM_DATA_RESET)" != "YES_I_UNDERSTAND_DATA_LOSS" ]; then echo "[protect] Destructive reset blocked. Use: ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make progress-mocks-reset"; exit 1; fi
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/progress_mocks.py reset


literacy-demo-seed:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py seed

literacy-demo-clean:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py cleanup

literacy-demo-reset:
	@if [ "$(ALLOW_DATA_RESET)" != "1" ] || [ "$(CONFIRM_DATA_RESET)" != "YES_I_UNDERSTAND_DATA_LOSS" ]; then echo "[protect] Destructive reset blocked. Use: ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make literacy-demo-reset"; exit 1; fi
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py reset

literacy-demo-realistic-seed:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py seed --profile realistic

literacy-demo-realistic-reset:
	@if [ "$(ALLOW_DATA_RESET)" != "1" ] || [ "$(CONFIRM_DATA_RESET)" != "YES_I_UNDERSTAND_DATA_LOSS" ]; then echo "[protect] Destructive reset blocked. Use: ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make literacy-demo-realistic-reset"; exit 1; fi
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/digital_literacy_demo_seed.py reset --profile realistic

mobile-runtime-seed:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py seed

mobile-runtime-clean:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py cleanup

mobile-runtime-reset:
	@if [ "$(ALLOW_DATA_RESET)" != "1" ] || [ "$(CONFIRM_DATA_RESET)" != "YES_I_UNDERSTAND_DATA_LOSS" ]; then echo "[protect] Destructive reset blocked. Use: ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make mobile-runtime-reset"; exit 1; fi
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py reset

mobile-runtime-verify:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py verify

mobile-runtime-heavy-seed:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py seed --profile mobile-heavy

mobile-runtime-heavy-reset:
	@if [ "$(ALLOW_DATA_RESET)" != "1" ] || [ "$(CONFIRM_DATA_RESET)" != "YES_I_UNDERSTAND_DATA_LOSS" ]; then echo "[protect] Destructive reset blocked. Use: ALLOW_DATA_RESET=1 CONFIRM_DATA_RESET=YES_I_UNDERSTAND_DATA_LOSS make mobile-runtime-heavy-reset"; exit 1; fi
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py reset --profile mobile-heavy

mobile-runtime-heavy-verify:
	cd backend && APP_DATABASE_URL='$(MOCK_DB_URL)' PYTHONPATH=. python3 scripts/mobile_runtime_demo_seed.py verify --profile mobile-heavy

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

mobile-theme-guard:
	@./scripts/check-mobile-theme-tokens.sh $$(git ls-files 'mobile/**/*.kt')

kg-sync:
	@python3 scripts/seed_kg_memory.py --project-root "$(PROJECT_ROOT)" --memory-file .context/operations/kg_memory.jsonl --replace

kg-sync-force: kg-sync
