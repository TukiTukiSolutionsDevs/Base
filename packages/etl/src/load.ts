/**
 * ETL one-shot: lee la hoja principal del .xlsx y la inserta en `companies`.
 *
 * Modos:
 *   tsx src/load.ts                 # truncate + insert
 *   tsx src/load.ts --upsert        # ON CONFLICT (ruc) DO UPDATE
 *   tsx src/load.ts --schema-only   # solo aplica schema.sql
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { Client } from 'pg';
import {
  cleanBoolEsNo,
  cleanDate,
  cleanEmail,
  cleanInt,
  cleanRuc,
  cleanText,
} from './normalize.js';

// --------------------------------------------------------------------------
// Config
// --------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));

const args = new Set(process.argv.slice(2));
const MODE_UPSERT = args.has('--upsert');
const SCHEMA_ONLY = args.has('--schema-only');

const XLSX_PATH = process.env.ETL_XLSX_PATH;
const SHEET_NAME = process.env.ETL_SHEET_NAME ?? 'Hoja2 (2)';

if (!SCHEMA_ONLY && !XLSX_PATH) {
  console.error('[etl] Falta ETL_XLSX_PATH en .env');
  process.exit(1);
}

const PG_CONFIG = {
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? 5432),
  user: process.env.POSTGRES_USER ?? 'tuki',
  password: process.env.POSTGRES_PASSWORD ?? 'tuki_dev',
  database: process.env.POSTGRES_DB ?? 'tuki_expertia',
};

const BATCH_SIZE = 500;

// --------------------------------------------------------------------------
// Mapeo: header en Excel → columna en Postgres + transformer
// --------------------------------------------------------------------------

type Mapping = {
  pg: string;
  fromHeader: string;
  transform: (v: unknown) => unknown;
};

const MAPPINGS: Mapping[] = [
  { pg: 'ruc',              fromHeader: 'Ruc',                transform: cleanRuc },
  { pg: 'razon_social',     fromHeader: 'Razon Social',       transform: cleanText },
  { pg: 'nombre_comercial', fromHeader: 'Nombre Comercial',   transform: cleanText },
  { pg: 'indice_riesgo',    fromHeader: 'Indice de Riesgo',   transform: cleanText },
  { pg: 'estado',           fromHeader: 'Estado',             transform: cleanText },
  { pg: 'tipo',              fromHeader: 'Tipo',              transform: cleanText },
  { pg: 'descripcion',      fromHeader: 'Descripcion',        transform: cleanText },
  { pg: 'sector',           fromHeader: 'Sector',             transform: cleanText },
  { pg: 'macrosector',      fromHeader: 'Macrosector',        transform: cleanText },
  { pg: 'productos',        fromHeader: 'Productos',          transform: cleanText },
  { pg: 'tamano',           fromHeader: 'Tamaño',             transform: cleanText },
  { pg: 'direccion',        fromHeader: 'Dirección',          transform: cleanText },
  { pg: 'distrito',         fromHeader: 'Distrito',           transform: cleanText },
  { pg: 'provincia',        fromHeader: 'Provincia',          transform: cleanText },
  { pg: 'departamento',     fromHeader: 'Departamento',       transform: cleanText },
  { pg: 'telefono_1',       fromHeader: 'Telefono 1',         transform: cleanText },
  { pg: 'telefono_2',       fromHeader: 'Telefono 2',         transform: cleanText },
  { pg: 'telefono_3',       fromHeader: 'Telefono 3',         transform: cleanText },
  { pg: 'celular_1',        fromHeader: 'Celular 1',          transform: cleanText },
  { pg: 'celular_2',        fromHeader: 'Celular 2',          transform: cleanText },
  { pg: 'email',            fromHeader: 'Email Corporativo',  transform: cleanEmail },
  { pg: 'fecha_fundacion',  fromHeader: 'Fecha de Fundación', transform: cleanDate },
  { pg: 'locales',          fromHeader: 'Locales',            transform: cleanInt },
  { pg: 'trabajadores',     fromHeader: 'Trabajadores',       transform: cleanInt },
  { pg: 'origen',           fromHeader: 'Extranjera o Local', transform: cleanText },
  { pg: 'pais_holding',     fromHeader: 'Pais Holding',       transform: cleanText },
  { pg: 'estatal',          fromHeader: 'Estatal',            transform: cleanBoolEsNo },
  { pg: 'privada_publica',  fromHeader: 'Privada o Publica',  transform: cleanText },
];

// --------------------------------------------------------------------------
// Schema bootstrap
// --------------------------------------------------------------------------

const applySchema = async (client: Client) => {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await client.query(sql);
  console.log('[etl] schema aplicado');
};

// --------------------------------------------------------------------------
// Excel → rows
// --------------------------------------------------------------------------

type Row = Record<string, unknown>;

const readSheet = async (path: string, sheetName: string): Promise<Row[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path);

  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new Error(`[etl] Hoja "${sheetName}" no encontrada`);

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.value ?? '').trim();
  });

  const rows: Row[] = [];
  for (let r = 2; r <= sheet.rowCount; r += 1) {
    const row = sheet.getRow(r);
    if (!row.hasValues) continue;
    const obj: Row = {};
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      const header = headers[col];
      if (!header) return;
      const v = cell.value;
      // `cell.value` puede traer { text, hyperlink } o { result, formula }
      if (v && typeof v === 'object' && 'text' in (v as object)) {
        obj[header] = (v as { text: string }).text;
      } else if (v && typeof v === 'object' && 'result' in (v as object)) {
        obj[header] = (v as { result: unknown }).result;
      } else {
        obj[header] = v;
      }
    });
    rows.push(obj);
  }
  return rows;
};

// --------------------------------------------------------------------------
// Insert (batched)
// --------------------------------------------------------------------------

const buildInsertSql = (cols: string[], batchSize: number, upsert: boolean): string => {
  const placeholders: string[] = [];
  for (let i = 0; i < batchSize; i += 1) {
    const offset = i * cols.length;
    const tuple = cols.map((_, j) => `$${offset + j + 1}`).join(', ');
    placeholders.push(`(${tuple})`);
  }

  const baseSql = `INSERT INTO companies (${cols.join(', ')}) VALUES ${placeholders.join(', ')}`;
  if (!upsert) return baseSql;

  const updates = cols
    .filter((c) => c !== 'ruc')
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(', ');
  return `${baseSql}
ON CONFLICT (ruc) DO UPDATE SET ${updates}, updated_at = NOW()`;
};

const insertBatch = async (
  client: Client,
  cols: string[],
  rows: unknown[][],
  upsert: boolean,
): Promise<void> => {
  if (rows.length === 0) return;
  const sql = buildInsertSql(cols, rows.length, upsert);
  const params = rows.flat();
  await client.query(sql, params);
};

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

const main = async () => {
  const client = new Client(PG_CONFIG);
  await client.connect();

  try {
    await applySchema(client);
    if (SCHEMA_ONLY) {
      console.log('[etl] --schema-only: listo.');
      return;
    }

    console.log(`[etl] Leyendo "${XLSX_PATH}" / hoja "${SHEET_NAME}" ...`);
    const rows = await readSheet(XLSX_PATH!, SHEET_NAME);
    console.log(`[etl] Filas encontradas: ${rows.length}`);

    const cols = [...MAPPINGS.map((m) => m.pg), 'raw'];

    if (!MODE_UPSERT) {
      await client.query('TRUNCATE TABLE companies RESTART IDENTITY');
      console.log('[etl] companies truncada (modo insert puro)');
    }

    let buffered: unknown[][] = [];
    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const values: unknown[] = MAPPINGS.map((m) => m.transform(row[m.fromHeader]));
      const ruc = values[0];
      if (!ruc) {
        skipped += 1;
        continue;
      }
      values.push(JSON.stringify(row));
      buffered.push(values);

      if (buffered.length >= BATCH_SIZE) {
        await insertBatch(client, cols, buffered, MODE_UPSERT);
        inserted += buffered.length;
        buffered = [];
        if (inserted % (BATCH_SIZE * 4) === 0) {
          console.log(`[etl] insertadas ${inserted} ...`);
        }
      }
    }

    if (buffered.length > 0) {
      await insertBatch(client, cols, buffered, MODE_UPSERT);
      inserted += buffered.length;
    }

    const { rows: countRows } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM companies',
    );
    console.log(`[etl] OK · insertadas=${inserted} · saltadas (sin RUC)=${skipped} · total tabla=${countRows[0].count}`);
  } finally {
    await client.end();
  }
};

main().catch((err) => {
  console.error('[etl] FALLÓ:', err);
  process.exit(1);
});
