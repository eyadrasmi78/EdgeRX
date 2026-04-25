.PHONY: help up down build seed logs sh tinker fresh test clean push-secrets

help:
	@echo "EdgeRX dev workflow"
	@echo "  make up         — boot the full local stack (postgres + redis + mailpit + backend + frontend + proxy)"
	@echo "  make down       — stop and remove containers"
	@echo "  make build      — rebuild images"
	@echo "  make fresh      — wipe DB and reseed with demo data"
	@echo "  make seed       — run DemoDataSeeder only"
	@echo "  make logs       — tail logs (all services)"
	@echo "  make sh         — bash into backend container"
	@echo "  make tinker     — Laravel Tinker REPL"
	@echo "  make test       — run pest/phpunit suite"

up:
	docker compose up -d
	@echo ""
	@echo "EdgeRX is booting. Once ready:"
	@echo "  http://localhost           — app"
	@echo "  http://localhost:8025      — Mailpit (email inbox)"
	@echo "  http://localhost:8000/up   — Laravel health"

down:
	docker compose down

build:
	docker compose build

seed:
	docker compose exec backend php artisan db:seed --force --class=DemoDataSeeder

fresh:
	docker compose exec backend php artisan migrate:fresh --seed --force

logs:
	docker compose logs -f --tail=200

sh:
	docker compose exec backend sh

tinker:
	docker compose exec backend php artisan tinker

test:
	docker compose exec backend php artisan test

clean:
	docker compose down -v
