#!/usr/bin/env bash
# Helper: recargar el .xlsx en la base ya levantada.
#   - Por defecto hace TRUNCATE + INSERT (load).
#   - Con --upsert hace ON CONFLICT (ruc) DO UPDATE (no destructivo).
#
# Uso:
#   bash scripts/load-data.sh
#   bash scripts/load-data.sh --upsert

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "✗ Falta .env — corré primero: bash scripts/deploy.sh" >&2
  exit 1
fi

MODE="${1:-load}"
case "$MODE" in
  load|--load)        CMD="npm run load" ;;
  upsert|--upsert)    CMD="npm run load:upsert" ;;
  schema|--schema)    CMD="npm run schema" ;;
  *) echo "modo desconocido: $MODE  (usá: load | upsert | schema)" >&2; exit 1 ;;
esac

echo "▶ Ejecutando ETL en modo: $CMD"
docker compose -f docker-compose.prod.yml --profile etl run --rm etl $CMD
echo "✓ Listo"
