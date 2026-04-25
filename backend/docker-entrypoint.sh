#!/bin/sh
# EdgeRX backend boot — runs once before the web server starts.
# Logs DB connectivity diagnostics so deploy errors are easy to read,
# then migrates + seeds idempotently.

set -eu

echo "──────────────── EdgeRX boot ────────────────"
echo "APP_ENV=${APP_ENV:-?}"
echo "DB_CONNECTION=${DB_CONNECTION:-?}"
echo "DB_HOST=${DB_HOST:-?}"
echo "DB_PORT=${DB_PORT:-?}"
echo "DB_DATABASE=${DB_DATABASE:-?}"
echo "DB_USERNAME=${DB_USERNAME:-?}"
echo "DB_PASSWORD set? $([ -n "${DB_PASSWORD:-}" ] && echo yes || echo no)"
echo "DB_SSLMODE=${DB_SSLMODE:-?}"
echo "─────────────────────────────────────────────"

# Wait until Postgres accepts connections (firewall propagation can lag).
# IMPORTANT: PG uses single-quoted strings; double-quoted things are identifiers.
echo "Probing DB connectivity..."
i=0
until php -r "
\$dsn = 'pgsql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE') . ';sslmode=' . (getenv('DB_SSLMODE') ?: 'require');
try {
    \$pdo = new PDO(\$dsn, getenv('DB_USERNAME'), getenv('DB_PASSWORD'), [PDO::ATTR_TIMEOUT => 5]);
    \$row = \$pdo->query(\"SELECT current_database() AS db, current_user AS u, has_schema_privilege(current_user, 'public', 'CREATE') AS can_create_in_public\")->fetch(PDO::FETCH_ASSOC);
    echo '  current_database=' . \$row['db'] . ' current_user=' . \$row['u'] . ' can_create_in_public=' . (\$row['can_create_in_public'] ? 'yes' : 'NO') . PHP_EOL;
    exit(0);
} catch (Throwable \$e) {
    echo '  PDO error: ' . \$e->getMessage() . PHP_EOL;
    exit(1);
}
"; do
    i=$((i + 1))
    if [ $i -ge 12 ]; then
        echo "ERROR: DB still unreachable after 60s — bailing out"
        exit 1
    fi
    echo "  retrying in 5s ($i/12)..."
    sleep 5
done

echo ""
echo "Running migrations..."
# `migrate --force` is idempotent — only runs new migrations
php artisan migrate --force

echo ""
echo "Running seeders (idempotent updateOrCreate)..."
php artisan db:seed --force --class=DemoDataSeeder || echo "  seeder failed (non-fatal — tables exist, demo data already there)"

echo ""
echo "storage:link..."
php artisan storage:link || true

echo ""
echo "config:cache + route:cache + view:cache for prod..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

echo ""
echo "──────── EdgeRX backend ready ────────"
