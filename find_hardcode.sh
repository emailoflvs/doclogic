#!/bin/bash

# Global script to find hardcoded email text in the project
# This script searches for specific Russian text patterns that indicate hardcoded email content

echo "🔍 Searching for hardcoded email text in the project..."
echo ""

# Patterns to search for
PATTERNS=(
    "Мы получили ваш запрос"
    "Дальше мы уточним"
    "ответьте на это письмо"
    "приложите.*накладных"
    "DocLogic: запрос получен"
    "Здравствуйте.*DocLogic"
    "Новый запрос DocLogic"
    "Если удобно"
)

# Exclude directories
EXCLUDE_DIRS="node_modules|.git|__pycache__|dist|build|.next"

# Search in all text files
echo "📁 Searching in all files..."
echo ""

for pattern in "${PATTERNS[@]}"; do
    echo "🔎 Searching for: '$pattern'"
    grep -r -n -i --include="*.js" --include="*.ts" --include="*.jsx" --include="*.py" \
         --include="*.env" --include="*.json" --include="*.md" \
         --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=__pycache__ \
         --exclude-dir=dist --exclude-dir=build \
         -E "$pattern" . 2>/dev/null | grep -v "find_hardcode.sh" || echo "  ✓ Not found"
    echo ""
done

# Also check Docker containers
echo "🐳 Checking Docker containers..."
CONTAINERS=$(docker ps --format "{{.Names}}" 2>/dev/null | grep doclogic || echo "")

if [ ! -z "$CONTAINERS" ]; then
    for container in $CONTAINERS; do
        echo "  Checking container: $container"
        docker exec $container sh -c 'find /app -type f \( -name "*.js" -o -name "*.py" \) -exec grep -l "Мы получили\|Дальше мы уточним\|ответьте на это письмо" {} \; 2>/dev/null' || echo "    No hardcode found"
    done
else
    echo "  No Docker containers found"
fi

echo ""
echo "✅ Search complete"

