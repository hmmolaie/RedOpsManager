#!/bin/sh
set -e

if [ "$WORKER_MODE" != "true" ]; then
  echo "[redops] applying migrations…"
  npx prisma migrate deploy
  echo "[redops] seeding (idempotent)…"
  npx prisma db seed
fi

exec "$@"
