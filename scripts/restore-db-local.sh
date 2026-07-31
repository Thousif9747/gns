#!/bin/bash
set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <backup-file.sql.gz>"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: File '$BACKUP_FILE' not found."
    exit 1
fi

echo "Terminating existing connections to gns_db..."
docker compose exec -T postgres psql -U gns_user -d postgres -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'gns_db' AND pid <> pg_backend_pid();
" 2>/dev/null || true

echo "Dropping database gns_db..."
docker compose exec -T postgres psql -U gns_user -d postgres -c "DROP DATABASE IF EXISTS gns_db;"

echo "Creating database gns_db..."
docker compose exec -T postgres psql -U gns_user -d postgres -c "CREATE DATABASE gns_db OWNER gns_user;"

echo "Restoring from $BACKUP_FILE..."
gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U gns_user -d gns_db

echo "Restore complete."
