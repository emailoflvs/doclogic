#!/bin/bash
# Add doclogic_v7 to /etc/hosts so http://doclogic_v7:8087/ works
set -e
ENTRY="127.0.0.1 doclogic_v7"
if grep -q ' doclogic_v7' /etc/hosts 2>/dev/null; then
  echo "doclogic_v7 already in /etc/hosts"
  exit 0
fi
echo "Adding: $ENTRY"
echo "$ENTRY" | sudo tee -a /etc/hosts
echo "Done. Open http://doclogic_v7:8087/"
