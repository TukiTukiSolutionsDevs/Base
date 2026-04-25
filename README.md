# TUKI · Expertia Dashboard

Dashboard B2B de prospección sobre 25k+ empresas peruanas. Stack TS end-to-end.

## Stack

- **Frontend**: Angular (builder Vite/esbuild) + Tailwind
- **Backend**: NestJS + TypeORM (clean architecture por feature)
- **DB**: Postgres 16 (Docker) + Adminer
- **ETL**: script TS one-shot con `exceljs`

## Layout

```
tuki-dashboard/
├── docker-compose.yml          Postgres + Adminer
├── apps/
│   ├── api/                    NestJS API
│   └── web/                    Angular SPA
└── packages/
    └── etl/                    Excel → Postgres loader
```

## Setup (orden)

```bash
# 1. Variables de entorno
cp .env.example .env

# 2. Levantar Postgres + Adminer
docker compose up -d

# 3. Cargar el Excel a Postgres (one-shot)
cd packages/etl
npm install
npm run load

# 4. Levantar la API
cd ../../apps/api
npm install
npm run start:dev          # http://localhost:3000

# 5. Levantar el frontend
cd ../web
npm install
npm start                  # http://localhost:4200
```

Adminer: http://localhost:8080  (System: PostgreSQL · Server: postgres · User/Pass: ver `.env`)

## Endpoints clave

- `GET /api/companies` — paginado + filtros (ver query params abajo)
- `GET /api/companies/facets` — valores únicos para los selects (sectores, departamentos, etc.)
- `GET /api/companies/stats` — KPIs del dashboard
- `GET /api/companies/export.csv` — exporta los resultados filtrados

### Query params soportados en `/api/companies`

| Param | Tipo | Ejemplo |
|---|---|---|
| `q` | string | búsqueda full-text en razón social / nombre comercial / RUC |
| `sector` | string[] | `?sector=AUTOMOTRIZ&sector=TURISMO` |
| `macrosector` | string[] | |
| `departamento` | string[] | |
| `provincia` | string[] | |
| `distrito` | string[] | |
| `tamano` | string[] | `Gran Empresa`, `Mediana`, etc. |
| `riesgo` | string[] | `BAJO` \| `MEDIO` \| `ALTO` |
| `estado` | string[] | `ACTIVO`, etc. |
| `origen` | string[] | `LOCAL` \| `EXTRANJERA` |
| `estatal` | boolean | |
| `tieneEmail` | boolean | filtra solo con email cargado |
| `trabajadoresMin` / `trabajadoresMax` | number | |
| `page` | number | default 1 |
| `pageSize` | number | default 50, max 200 |
| `sortBy` | string | `trabajadores` \| `razonSocial` \| `fechaFundacion` |
| `sortDir` | `asc` \| `desc` | |

## Convenciones

- Clean architecture en `apps/api` (capas: `domain` / `application` / `infrastructure` / `presentation`).
- Standalone components + signals en Angular.
- Sin librerías UI pesadas: Tailwind + componentes propios. Tabla con CDK virtual scroll.
- ETL es **idempotente**: `TRUNCATE` + `INSERT` por defecto, flag `--upsert` para actualizar por RUC.
