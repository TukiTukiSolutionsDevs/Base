# Scripts de operación

## Despliegue inicial en VPS

```bash
git clone <tu-repo> tuki-dashboard
cd tuki-dashboard
# Subí el .xlsx a algún path de la VPS (ej: scp source.xlsx user@vps:/home/ubuntu/data/)
bash scripts/deploy.sh
```

El script:
1. Verifica `docker`, `docker compose plugin`, `openssl`.
2. Pregunta path absoluto al `.xlsx` en la VPS.
3. Pregunta puerto web (default sugerido: **8443** para evitar 80/443/8080).
4. Pregunta URL pública (para CORS).
5. Pregunta usuario y password de TukiTuki y Expertia (sugiere passwords random fuertes).
6. Genera `JWT_SECRET` (96 chars hex) y `POSTGRES_PASSWORD` aleatorios.
7. Escribe `.env` con `chmod 600`.
8. Levanta el stack con `docker-compose.prod.yml`.
9. Espera que el API esté listo y ofrece cargar el `.xlsx` ahora.
10. Imprime resumen con URL y credenciales.

**Reusar `.env` ya creado**: `bash scripts/deploy.sh --reuse-env` (no pregunta nada).

## Recargar datos

```bash
bash scripts/load-data.sh             # TRUNCATE + INSERT (default)
bash scripts/load-data.sh --upsert    # ON CONFLICT (ruc) DO UPDATE — no destructivo
bash scripts/load-data.sh --schema    # solo aplica/actualiza schema
```

## Recrear usuarios (cambio de password)

Si cambiaste `TUKI_PASSWORD` o `EXPERTIA_PASSWORD` en `.env` después del primer
arranque, el API respeta los users existentes y NO los sobrescribe (es seguro).
Para forzar el re-seed con los nuevos valores:

```bash
bash scripts/reset-users.sh
```

Borra los users de la DB y reinicia el API; al arrancar los re-crea con el `.env` actual.

## Operaciones cotidianas

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f web

# Reiniciar un servicio
docker compose -f docker-compose.prod.yml restart api

# Bajar todo
docker compose -f docker-compose.prod.yml down

# Bajar todo + borrar volumen Postgres (⚠ borra los datos cargados)
docker compose -f docker-compose.prod.yml down -v
```

## Acceso temporal a Adminer en producción

Por seguridad Adminer no se levanta en prod. Si necesitás acceso puntual:

```bash
docker compose -f docker-compose.prod.yml --profile tools up -d adminer
# → http://VPS:18080  (System: PostgreSQL · Server: postgres · User/Pass del .env)
docker compose -f docker-compose.prod.yml --profile tools stop adminer
```

## Puertos

| Servicio | Dev (`docker-compose.yml`) | Prod (`docker-compose.prod.yml`)        |
|----------|----------------------------|------------------------------------------|
| web      | `8081 → 80`                | `${WEB_PORT:-8443} → 80` (configurable) |
| api      | `3000 → 3000`              | **NO expuesto** (sólo red interna)      |
| postgres | `5432 → 5432`              | **NO expuesto** (sólo red interna)      |
| adminer  | `8080 → 8080` (siempre)    | `${ADMINER_PORT:-18080}` (sólo `--profile tools`) |

## HTTPS / dominio

El stack expone HTTP en `WEB_PORT`. Para HTTPS poné un reverse-proxy upstream:

**Caddy** (recomendado, certificado automático):
```caddyfile
tuki.tuempresa.com {
    reverse_proxy localhost:8443
}
```

**Nginx**:
```nginx
server {
    listen 443 ssl http2;
    server_name tuki.tuempresa.com;
    ssl_certificate     /path/fullchain.pem;
    ssl_certificate_key /path/privkey.pem;

    location / {
        proxy_pass http://localhost:8443;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Y en `.env` actualizá:
```
API_CORS_ORIGIN=https://tuki.tuempresa.com
COOKIE_SECURE=true
```
Después: `docker compose -f docker-compose.prod.yml restart api`.
