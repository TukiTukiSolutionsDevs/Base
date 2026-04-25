/**
 * Normalizadores: limpieza de strings/fechas/números provenientes del Excel.
 * Mantenidos puros y testeables (no tocan IO).
 */

export const cleanText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s || s === '-' || s.toLowerCase() === 'null') return null;
  return s;
};

export const cleanRuc = (value: unknown): string | null => {
  const s = cleanText(value);
  if (!s) return null;
  const digits = s.replace(/\D/g, '');
  if (digits.length !== 11) return null;
  return digits;
};

export const cleanInt = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  const n = parseInt(String(value).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : null;
};

export const cleanEmail = (value: unknown): string | null => {
  const s = cleanText(value);
  if (!s) return null;
  const lower = s.toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lower) ? lower : null;
};

export const cleanBoolEsNo = (value: unknown): boolean | null => {
  const s = cleanText(value);
  if (!s) return null;
  const lower = s.toLowerCase();
  if (['si', 'sí', 'yes', 'true', '1'].includes(lower)) return true;
  if (['no', 'false', '0'].includes(lower)) return false;
  return null;
};

/**
 * Acepta:
 *  - Date nativo (exceljs ya lo da así para celdas tipo fecha)
 *  - "01/01/1970" (dd/mm/yyyy)
 *  - "1997-12-01"
 * Devuelve ISO date (yyyy-mm-dd) o null.
 * Filtra el sentinel "01/01/1970" que aparece masivamente como "fecha desconocida".
 */
export const cleanDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;

  let date: Date | null = null;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const s = value.trim();
    const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (ddmmyyyy) {
      const [, d, m, y] = ddmmyyyy;
      date = new Date(Number(y), Number(m) - 1, Number(d));
    } else {
      const parsed = new Date(s);
      if (!Number.isNaN(parsed.getTime())) date = parsed;
    }
  }

  if (!date || Number.isNaN(date.getTime())) return null;

  const iso = date.toISOString().slice(0, 10);
  // sentinel "fecha desconocida"
  if (iso === '1970-01-01') return null;
  return iso;
};
