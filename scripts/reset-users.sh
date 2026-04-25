#!/usr/bin/env bash
# Borra los users tuki/expertia de la DB para que el API los re-seedee al próximo
# arranque con las credenciales actuales del .env.
#
# Útil cuando cambiás passwords en .env DESPUÉS del primer arranque
# (el AuthService respeta usuarios existentes y no sobrescribe).
#
# Uso:
#   bash scripts/reset-users.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f .env ]]; then
  echo "✗ Falta .env" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

read -r -p "Esto BORRA los users tuki/expertia y los recrea con el .env actual. ¿Seguís? [y/N]: " ans
[[ "$ans" =~ ^[YySs]$ ]] || { echo "Abortado."; exit 0; }

echo "▶ Borrando users de la DB"
docker exec -i tuki_postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "DELETE FROM users WHERE username IN ('${TUKI_USERNAME:-tuki}', '${EXPERTIA_USERNAME:-expertia}');" \
  || { echo "✗ Falló DELETE — ¿postgres no levantado?"; exit 1; }

echo "▶ Reiniciando API (re-seedea al arrancar)"
docker compose -f docker-compose.prod.yml restart api

sleep 3
docker logs tuki_api 2>&1 | tail -10 | grep -E "Seeded|users schema|listening" || true

echo "✓ Listo. Login con:"
echo "    ${TUKI_USERNAME:-tuki} / ${TUKI_PASSWORD}"
echo "    ${EXPERTIA_USERNAME:-expertia} / ${EXPERTIA_PASSWORD}"
