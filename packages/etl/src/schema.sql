-- ============================================================================
-- TUKI Expertia · Postgres schema
--   - companies: dataset de prospección (cargado desde el .xlsx por el ETL)
--   - users    : usuarios autorizados (seedeados por el API al arranque)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ----------------------------------------------------------------------------
-- companies
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id                  BIGSERIAL PRIMARY KEY,
    ruc                 VARCHAR(11) NOT NULL UNIQUE,
    razon_social        TEXT NOT NULL,
    nombre_comercial    TEXT,
    indice_riesgo       TEXT,
    estado              TEXT,
    tipo                TEXT,
    descripcion         TEXT,
    sector              TEXT,
    macrosector         TEXT,
    productos           TEXT,
    tamano              TEXT,
    direccion           TEXT,
    distrito            TEXT,
    provincia           TEXT,
    departamento        TEXT,
    telefono_1          TEXT,
    telefono_2          TEXT,
    telefono_3          TEXT,
    celular_1           TEXT,
    celular_2           TEXT,
    email               TEXT,
    fecha_fundacion     DATE,
    locales             INTEGER,
    trabajadores        INTEGER,
    origen              TEXT,
    pais_holding        TEXT,
    estatal             BOOLEAN,
    privada_publica     TEXT,
    raw                 JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_sector       ON companies (sector);
CREATE INDEX IF NOT EXISTS idx_companies_macrosector  ON companies (macrosector);
CREATE INDEX IF NOT EXISTS idx_companies_departamento ON companies (departamento);
CREATE INDEX IF NOT EXISTS idx_companies_provincia    ON companies (provincia);
CREATE INDEX IF NOT EXISTS idx_companies_distrito     ON companies (distrito);
CREATE INDEX IF NOT EXISTS idx_companies_tamano       ON companies (tamano);
CREATE INDEX IF NOT EXISTS idx_companies_riesgo       ON companies (indice_riesgo);
CREATE INDEX IF NOT EXISTS idx_companies_estado       ON companies (estado);
CREATE INDEX IF NOT EXISTS idx_companies_origen       ON companies (origen);
CREATE INDEX IF NOT EXISTS idx_companies_trabajadores ON companies (trabajadores);

CREATE INDEX IF NOT EXISTS idx_companies_search_trgm
    ON companies USING GIN ((razon_social || ' ' || COALESCE(nombre_comercial, '') || ' ' || ruc) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_companies_has_email
    ON companies ((email IS NOT NULL AND email <> ''));

-- ----------------------------------------------------------------------------
-- users (autenticación)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              BIGSERIAL PRIMARY KEY,
    username        VARCHAR(64) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,         -- bcrypt
    display_name    VARCHAR(128) NOT NULL,
    organization    VARCHAR(64)  NOT NULL,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users (organization);
