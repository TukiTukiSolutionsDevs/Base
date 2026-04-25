#!/usr/bin/env bash
# =============================================================================
# TUKI Expertia · Despliegue interactivo en VPS
#
# Uso:
#   bash scripts/deploy.sh                 # interactivo (recomendado primera vez)
#   bash scripts/deploy.sh --reuse-env     # usa el .env existente, no pregunta nada
#
# Qué hace:
#   1. Genera secretos seguros (JWT_SECRET, POSTGRES_PASSWORD)
#   2. Pregunta usuarios/passwords de TukiTuki y Expertia (con defaults sugeridos)
#   3. Pregunta puerto público para web (default 8443, NO 80/443/8080)
#   4. Pregunta path absoluto al .xlsx en la VPS
#   5. Escribe .env (con backup si ya existía)
#   6. Levanta el stack (postgres + api + web) en modo prod
#   7. Ofrece cargar/recargar la data del .xlsx
#   8. Imprime resumen con URL y credenciales
# =============================================================================

set -euo pipefail

# --- ubicación: el script se invoca desde la raíz del repo ---
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT_DIR}"

ENV_FILE="${ROOT_DIR}/.env"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

# --- colores legibles -------------------------------------------------------
if [[ -t 1 ]]; then
  C_RST="\033[0m"; C_B="\033[1m"; C_DIM="\033[2m"
  C_GRN="\033[32m"; C_YEL="\033[33m"; C_RED="\033[31m"; C_CYN="\033[36m"; C_MAG="\033[35m"
else
  C_RST=""; C_B=""; C_DIM=""; C_GRN=""; C_YEL=""; C_RED=""; C_CYN=""; C_MAG=""
fi

say()   { printf "%b\n" "$*"; }
hdr()   { say "\n${C_B}${C_MAG}━━━ $* ━━━${C_RST}"; }
ok()    { say "${C_GRN}✓${C_RST} $*"; }
info()  { say "${C_CYN}•${C_RST} $*"; }
warn()  { say "${C_YEL}⚠${C_RST} $*"; }
err()   { say "${C_RED}✗${C_RST} $*" >&2; }

# --- prerequisitos ----------------------------------------------------------
check_prereqs() {
  local missing=()
  command -v docker  >/dev/null || missing+=("docker")
  command -v openssl >/dev/null || missing+=("openssl")
  if ! docker compose version >/dev/null 2>&1; then
    missing+=("docker-compose-plugin")
  fi
  if ((${#missing[@]} > 0)); then
    err "Faltan dependencias: ${missing[*]}"
    err "En Ubuntu/Debian: sudo apt update && sudo apt install -y docker.io docker-compose-plugin openssl"
    exit 1
  fi
}

# --- helpers de prompt ------------------------------------------------------
ask() {
  # ask "Pregunta" "default" → setea $REPLY_VAL
  local prompt="$1" default="${2:-}" answer=""
  if [[ -n "$default" ]]; then
    read -r -p "$(printf "${C_B}%s${C_RST} ${C_DIM}[%s]${C_RST}: " "$prompt" "$default")" answer || true
    REPLY_VAL="${answer:-$default}"
  else
    while [[ -z "$answer" ]]; do
      read -r -p "$(printf "${C_B}%s${C_RST}: " "$prompt")" answer || true
    done
    REPLY_VAL="$answer"
  fi
}

ask_secret() {
  # Lectura silenciosa para passwords con default visible
  local prompt="$1" default="${2:-}" answer=""
  read -r -s -p "$(printf "${C_B}%s${C_RST} ${C_DIM}[Enter para usar el sugerido]${C_RST}: " "$prompt")" answer || true
  echo
  REPLY_VAL="${answer:-$default}"
}

confirm() {
  # confirm "Pregunta" "Y/n" → 0 si yes
  local prompt="$1" default="${2:-Y}" answer=""
  read -r -p "$(printf "${C_B}%s${C_RST} ${C_DIM}[%s]${C_RST}: " "$prompt" "$default")" answer || true
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[YySs]$ ]]
}

rand_secret() { openssl rand -hex 48; }
rand_pass()   { openssl rand -base64 18 | tr -d '/+=' | head -c 20; }

# --- paso 1: prerequisitos --------------------------------------------------
hdr "TUKI Expertia · Despliegue"
check_prereqs
ok "docker, openssl y compose-plugin presentes"

# --- paso 2: política sobre .env existente ----------------------------------
REUSE_ONLY=false
if [[ "${1:-}" == "--reuse-env" ]]; then
  REUSE_ONLY=true
fi

if [[ -f "$ENV_FILE" && "$REUSE_ONLY" == "true" ]]; then
  ok ".env existente — modo --reuse-env, salto las preguntas"
elif [[ -f "$ENV_FILE" ]]; then
  warn ".env ya existe en $(dirname "$ENV_FILE")"
  if confirm "¿Querés regenerarlo (R) o reusarlo (n)?" "n"; then
    cp "$ENV_FILE" "${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
    ok "backup → ${ENV_FILE}.bak.*"
  else
    REUSE_ONLY=true
  fi
fi

# --- paso 3: recolectar configuración ---------------------------------------
if [[ "$REUSE_ONLY" == "false" ]]; then
  hdr "Configuración"

  # Path del XLSX
  info "Necesito el path ABSOLUTO al archivo .xlsx en esta VPS."
  info "Ejemplo: /home/ubuntu/data/expertia-2026.xlsx"
  while true; do
    ask "Path del .xlsx" ""
    XLSX_HOST_PATH="$REPLY_VAL"
    if [[ -f "$XLSX_HOST_PATH" ]]; then
      ok "encontrado: $XLSX_HOST_PATH"
      break
    fi
    err "no existe: $XLSX_HOST_PATH"
  done

  # Puerto público de web
  info "Puerto público para el dashboard. Sugerencia: 8443 (raro, no colisiona con 80/443/8080)."
  ask "Puerto web" "8443"
  WEB_PORT="$REPLY_VAL"

  # CORS / URL pública
  info "URL pública desde donde se va a acceder al dashboard."
  info "Si tenés un dominio + reverse proxy upstream (Caddy/nginx), ponelo. Si no, http://IP:PORT."
  ask "URL pública (CORS origin)" "http://localhost:${WEB_PORT}"
  PUBLIC_URL="$REPLY_VAL"

  # Cookie secure
  if [[ "$PUBLIC_URL" == https://* ]]; then
    COOKIE_SECURE="true"
    info "Detecté HTTPS → COOKIE_SECURE=true"
  else
    COOKIE_SECURE="false"
    warn "URL HTTP → COOKIE_SECURE=false (no recomendado para producción real)"
  fi

  # Usuarios
  hdr "Usuarios autorizados (sólo TukiTuki + Expertia)"

  ask "Username TukiTuki" "tuki"
  TUKI_USERNAME="$REPLY_VAL"

  TUKI_PASSWORD_DEFAULT="Tuki-$(date +%Y)-$(rand_pass)"
  info "Sugerencia password TukiTuki: ${C_GRN}${TUKI_PASSWORD_DEFAULT}${C_RST}"
  ask_secret "Password TukiTuki" "$TUKI_PASSWORD_DEFAULT"
  TUKI_PASSWORD="$REPLY_VAL"

  ask "Username Expertia" "expertia"
  EXPERTIA_USERNAME="$REPLY_VAL"

  EXPERTIA_PASSWORD_DEFAULT="Expertia-$(date +%Y)-$(rand_pass)"
  info "Sugerencia password Expertia: ${C_GRN}${EXPERTIA_PASSWORD_DEFAULT}${C_RST}"
  ask_secret "Password Expertia" "$EXPERTIA_PASSWORD_DEFAULT"
  EXPERTIA_PASSWORD="$REPLY_VAL"

  # Secretos auto-generados
  hdr "Generando secretos"
  JWT_SECRET="$(rand_secret)"
  POSTGRES_PASSWORD="$(rand_pass)"
  ok "JWT_SECRET (96 chars hex) generado"
  ok "POSTGRES_PASSWORD generado"

  # --- paso 4: confirmación + escritura ------------------------------------
  hdr "Resumen"
  cat <<RESUMEN
  ${C_DIM}Path xlsx        :${C_RST} $XLSX_HOST_PATH
  ${C_DIM}Puerto web       :${C_RST} $WEB_PORT
  ${C_DIM}URL pública      :${C_RST} $PUBLIC_URL
  ${C_DIM}Cookie secure    :${C_RST} $COOKIE_SECURE
  ${C_DIM}Tuki user/pass   :${C_RST} ${C_B}$TUKI_USERNAME${C_RST} / ${C_B}$TUKI_PASSWORD${C_RST}
  ${C_DIM}Expertia user/p  :${C_RST} ${C_B}$EXPERTIA_USERNAME${C_RST} / ${C_B}$EXPERTIA_PASSWORD${C_RST}
RESUMEN

  if ! confirm "¿Escribir .env y arrancar?" "Y"; then
    warn "Abortado por el usuario. Nada se escribió."
    exit 0
  fi

  cat > "$ENV_FILE" <<ENV
# Generado por scripts/deploy.sh el $(date '+%Y-%m-%d %H:%M:%S')
# NO commitear este archivo. Tiene secretos.

# Postgres (interno; no se expone al host en prod)
POSTGRES_USER=tuki_app
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=tuki_expertia

# Web (único puerto expuesto al host)
WEB_PORT=$WEB_PORT
ADMINER_PORT=18080
API_CORS_ORIGIN=$PUBLIC_URL

# Auth
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=12h
COOKIE_SECURE=$COOKIE_SECURE
COOKIE_SAMESITE=lax

# Usuarios autorizados (seedeados al primer arranque)
TUKI_USERNAME=$TUKI_USERNAME
TUKI_PASSWORD=$TUKI_PASSWORD
TUKI_DISPLAY_NAME=TukiTuki
TUKI_ORG=tukituki

EXPERTIA_USERNAME=$EXPERTIA_USERNAME
EXPERTIA_PASSWORD=$EXPERTIA_PASSWORD
EXPERTIA_DISPLAY_NAME=Expertia
EXPERTIA_ORG=expertia

# ETL (path absoluto al .xlsx en esta VPS)
XLSX_HOST_PATH=$XLSX_HOST_PATH
ETL_SHEET_NAME=Hoja2 (2)
ENV
  chmod 600 "$ENV_FILE"
  ok ".env escrito (chmod 600)"
fi

# --- paso 5: levantar stack -------------------------------------------------
hdr "Buildeando y levantando stack (postgres + api + web)"
docker compose -f "$COMPOSE_FILE" up -d --build
ok "containers up"

# --- paso 6: esperar healthchecks -------------------------------------------
hdr "Esperando que API esté lista"
for i in {1..40}; do
  if docker exec tuki_api wget -qO- http://localhost:3000/api/companies/stats >/dev/null 2>&1; then
    ok "API respondiendo (aunque devolvió 401 de auth, lo que es lo esperado)"
    break
  fi
  # 401 también cuenta como "API up". Probamos con un check menos estricto.
  if docker logs tuki_api 2>&1 | grep -q "API listening"; then
    ok "API arrancó"
    break
  fi
  sleep 1
  if (( i == 40 )); then
    err "API no respondió en 40s"
    err "Logs últimos:"
    docker logs --tail 40 tuki_api
    exit 1
  fi
done

# --- paso 7: ofrecer carga de datos -----------------------------------------
hdr "Carga de datos"

# Cuenta cuántas empresas hay
CURRENT_COUNT="$(docker exec tuki_postgres psql -U "$(grep ^POSTGRES_USER "$ENV_FILE" | cut -d= -f2)" -d tuki_expertia -tAc 'SELECT COUNT(*) FROM companies' 2>/dev/null || echo "0")"
CURRENT_COUNT="${CURRENT_COUNT//[^0-9]/}"
CURRENT_COUNT="${CURRENT_COUNT:-0}"
info "Empresas actualmente en DB: $CURRENT_COUNT"

if [[ "$CURRENT_COUNT" -gt 0 ]]; then
  if confirm "Ya hay datos. ¿Recargar (TRUNCATE + INSERT) desde el .xlsx?" "n"; then
    DO_LOAD=true
  else
    DO_LOAD=false
  fi
else
  if confirm "DB vacía. ¿Cargar el .xlsx ahora?" "Y"; then
    DO_LOAD=true
  else
    DO_LOAD=false
    warn "Saltando carga. Cuando quieras: bash scripts/load-data.sh"
  fi
fi

if [[ "$DO_LOAD" == "true" ]]; then
  hdr "Ejecutando ETL (puede tomar 1-3 minutos)"
  docker compose -f "$COMPOSE_FILE" --profile etl run --rm etl npm run load
  ok "ETL completado"
fi

# --- paso 8: resumen final --------------------------------------------------
hdr "✅ Listo"

# Re-leer .env para mostrar valores reales (especialmente si fue --reuse-env)
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

cat <<FINAL

  ${C_B}URL${C_RST}         : ${C_GRN}${API_CORS_ORIGIN}${C_RST}
  ${C_B}Tuki${C_RST}        : ${C_B}${TUKI_USERNAME}${C_RST} / ${C_B}${TUKI_PASSWORD}${C_RST}
  ${C_B}Expertia${C_RST}    : ${C_B}${EXPERTIA_USERNAME}${C_RST} / ${C_B}${EXPERTIA_PASSWORD}${C_RST}

  ${C_DIM}Comandos útiles:${C_RST}
    docker compose -f docker-compose.prod.yml logs -f api
    docker compose -f docker-compose.prod.yml restart api
    docker compose -f docker-compose.prod.yml down
    bash scripts/load-data.sh           # recargar datos
    bash scripts/reset-users.sh         # recrear usuarios con nuevas passwords

  ${C_YEL}⚠${C_RST}  Guardá estas credenciales en un password manager.
     El .env ya quedó con chmod 600 — sólo el dueño puede leerlo.

FINAL
