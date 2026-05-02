/* TUKI · Helpers de fecha relativa (replican components.jsx) */

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  return new Date(s.length <= 10 ? s + 'T00:00:00' : s);
}

export function relTime(s: string | null | undefined, now: Date = new Date()): string {
  if (!s) return '—';
  const d = parseDate(s);
  if (!d) return '—';
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 0) {
    const fwd = Math.abs(diff);
    if (fwd < 86400) return 'hoy';
    const days = Math.floor(fwd / 86400);
    if (days === 1) return 'mañana';
    if (days < 7) return `en ${days}d`;
    return `en ${Math.floor(days / 7)}sem`;
  }
  if (diff < 60)    return 'ahora';
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days === 1)  return 'ayer';
  if (days < 30)   return `hace ${days}d`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `hace ${m} mes${m > 1 ? 'es' : ''}`;
  }
  return `hace ${Math.floor(days / 365)}a`;
}

export function fmtDate(s: string | null | undefined): string {
  if (!s) return '—';
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

export function fmtDateLong(s: string | null | undefined): string {
  if (!s) return '—';
  const d = parseDate(s);
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function fmtTime(s: string | null | undefined): string {
  if (!s) return '';
  const d = parseDate(s);
  if (!d) return '';
  return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
}
