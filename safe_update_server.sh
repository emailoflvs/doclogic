#!/bin/bash
# Безопасное обновление сервера через git
# Не перезаписывает production файлы (docker-compose.yml, .env)

set -e

SERVER="debian@57.129.62.58"
SERVER_PATH="/opt/docker-projects/doclogic_gpt"

echo "🔄 Безопасное обновление сервера..."
echo ""

# Список файлов, которые НЕ должны обновляться на сервере
PROTECTED_FILES=(
    "docker-compose.yml"
    "api/.env"
)

echo "1️⃣  Создание бэкапов защищённых файлов..."
for file in "${PROTECTED_FILES[@]}"; do
    echo "   Бэкап: $file"
    ssh $SERVER "cd $SERVER_PATH && cp $file ${file}.backup.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true"
done

echo ""
echo "2️⃣  Обновление кода из git (только файлы кода)..."
# Клонируем или обновляем только файлы кода, не трогая production файлы
ssh $SERVER "cd $SERVER_PATH && {
    if [ ! -d .git ]; then
        echo 'Git репозиторий не найден - пропускаем обновление'
        exit 0
    fi
    
    # Сохраняем текущие production файлы
    for file in ${PROTECTED_FILES[@]}; do
        if [ -f \$file ]; then
            cp \$file \$file.production_backup
        fi
    done
    
    # Обновляем из git
    git fetch origin
    git reset --hard origin/master
    
    # Восстанавливаем production файлы
    for file in ${PROTECTED_FILES[@]}; do
        if [ -f \$file.production_backup ]; then
            mv \$file.production_backup \$file
            echo 'Восстановлен production файл: '\$file
        fi
    done
}"

echo ""
echo "3️⃣  Пересборка контейнеров..."
ssh $SERVER "cd $SERVER_PATH && docker compose build && docker compose up -d"

echo ""
echo "✅ Обновление завершено!"
echo "   Защищённые файлы сохранены: ${PROTECTED_FILES[@]}"

