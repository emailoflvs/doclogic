#!/bin/bash
# Полная пересборка фронта: очистка кэша, сборка образа без кэша, перезапуск контейнера.
# Запускать из корня репозитория: ./scripts/rebuild-web.sh

set -e
cd "$(dirname "$0")/.."

echo "=== 1. Проверка: что в сборку попадёт текущий index.astro ==="
HASH=$(sha256sum web/src/pages/index.astro 2>/dev/null || md5sum web/src/pages/index.astro 2>/dev/null | awk '{print $1}')
echo "  Хеш web/src/pages/index.astro: $HASH"
echo "  (тот же хеш будет в логе сборки Docker — сверьте)"
echo ""

echo "=== 2. Очистка локальных кэшей фронта ==="
(cd web && rm -rf dist .astro node_modules/.cache node_modules/.vite 2>/dev/null; echo "  OK")
echo ""

echo "=== 3. Сборка образа web без кэша ==="
docker compose build --no-cache web
echo ""

echo "=== 4. Перезапуск контейнера web ==="
docker compose up -d --force-recreate web
echo ""

echo "=== Готово. Дальше:"
echo "  1. Откройте http://localhost:8087/"
echo "  2. Обязательно жёсткое обновление: Ctrl+Shift+R (или Cmd+Shift+R на Mac)"
echo "  3. Либо откройте сайт в режиме инкогнито"
echo ""
