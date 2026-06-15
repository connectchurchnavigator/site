#!/bin/bash

# ChurchNavigator Cron Jobs
# Add to Railway cron or server crontab:
# 0 2 * * 0 /path/to/backend/cron_jobs.sh dedup

set -e

cd "$(dirname "$0")"

case "$1" in
  dedup)
    echo "[$(date)] Running deduplication scan"
    python3 scripts/deduplicate_churches.py >> logs/dedup.log 2>&1
    echo "[$(date)] Deduplication complete"
    ;;
  *)
    echo "Usage: $0 {dedup}"
    exit 1
    ;;
esac