/**
 * Macro-regiones comerciales de Perú.
 * Single source of truth: si la clasificación cambia, este archivo cambia.
 *
 * Notas:
 *  - "LIMA METROPOLITANA" es zona aparte (concentra ~70% de la base).
 *  - "Áncash" / "Ancash" están duplicados por encoding en la fuente; cubrimos ambos.
 *  - "No definido" queda intencionalmente fuera (no pertenece a ninguna región).
 */
export const REGIONS = {
  'LIMA METROPOLITANA': ['Lima'],
  'NORTE': ['Tumbes', 'Piura', 'Lambayeque', 'La Libertad', 'Cajamarca', 'Ancash', 'Áncash'],
  'CENTRO': ['Ica', 'Junín', 'Pasco', 'Huánuco', 'Huancavelica', 'Ayacucho'],
  'SUR': ['Arequipa', 'Moquegua', 'Tacna', 'Cusco', 'Puno', 'Apurímac', 'Madre de Dios'],
  'ORIENTE': ['Loreto', 'San Martín', 'Amazonas', 'Ucayali'],
} as const;

export type RegionKey = keyof typeof REGIONS;
export const REGION_KEYS = Object.keys(REGIONS) as RegionKey[];

/** Lista plana de departamentos pertenecientes a las regiones dadas. */
export const departamentosForRegions = (regions: string[]): string[] => {
  const out = new Set<string>();
  for (const r of regions) {
    const list = (REGIONS as Record<string, readonly string[]>)[r];
    if (list) for (const d of list) out.add(d);
  }
  return [...out];
};

/** Inverso: dado un departamento, qué región es (o null si no mapea). */
const DEPT_TO_REGION = ((): Map<string, RegionKey> => {
  const m = new Map<string, RegionKey>();
  for (const [region, depts] of Object.entries(REGIONS) as [RegionKey, readonly string[]][]) {
    for (const d of depts) m.set(d, region);
  }
  return m;
})();

export const regionOfDepartamento = (dep: string | null): RegionKey | null =>
  dep ? DEPT_TO_REGION.get(dep) ?? null : null;
