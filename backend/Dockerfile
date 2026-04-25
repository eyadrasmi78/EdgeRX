# syntax=docker/dockerfile:1.7
# Two-stage Dockerfile for Laravel backend.
# - "dev" target: development server (artisan serve + bind-mounted source)
# - "prod" target: nginx + php-fpm baked image for DO App Platform

############# base #############
FROM php:8.4-cli-alpine AS base
WORKDIR /var/www/html

RUN apk add --no-cache \
        bash git curl icu-dev libzip-dev libpng-dev oniguruma-dev \
        postgresql-dev autoconf g++ make linux-headers \
    && docker-php-ext-install -j$(nproc) \
        pdo_pgsql pgsql intl bcmath zip pcntl opcache \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del autoconf g++ make linux-headers

COPY --from=composer:2.7 /usr/bin/composer /usr/bin/composer

############# dev #############
FROM base AS dev
ENV PHP_MEMORY_LIMIT=512M
RUN echo "memory_limit=${PHP_MEMORY_LIMIT}" > /usr/local/etc/php/conf.d/zz-edgerx.ini
EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]

############# prod #############
FROM base AS prod
ENV APP_ENV=production
ENV PHP_MEMORY_LIMIT=512M
RUN echo "memory_limit=${PHP_MEMORY_LIMIT}" > /usr/local/etc/php/conf.d/zz-edgerx.ini
COPY . /var/www/html/
RUN composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist \
    && mkdir -p storage/framework/{cache,sessions,views} storage/logs bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache
EXPOSE 8080
COPY docker-entrypoint.sh /usr/local/bin/edgerx-entrypoint.sh
COPY docker-scheduler-entrypoint.sh /usr/local/bin/edgerx-scheduler-entrypoint.sh
RUN chmod +x /usr/local/bin/edgerx-entrypoint.sh /usr/local/bin/edgerx-scheduler-entrypoint.sh
# DO App Platform sets $PORT; default 8080
CMD ["sh", "-c", "/usr/local/bin/edgerx-entrypoint.sh && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
