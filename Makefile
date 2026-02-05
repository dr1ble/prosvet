.PHONY: up down logs backend-test backend-lint

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

backend-test:
	cd backend && pytest

backend-lint:
	cd backend && ruff check .
