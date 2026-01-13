#!/bin/bash
# Скрипт для добавления записи doclogic_gpt5 в /etc/hosts

if grep -q "doclogic_gpt5" /etc/hosts; then
    echo "Запись doclogic_gpt5 уже существует в /etc/hosts"
else
    echo "Добавление записи doclogic_gpt5 в /etc/hosts..."
    echo "127.0.0.1 doclogic_gpt5" | sudo tee -a /etc/hosts
    echo "✓ Запись добавлена. Теперь доступен http://doclogic_gpt5:8085"
fi

