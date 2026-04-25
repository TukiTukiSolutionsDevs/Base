export interface Company {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  indiceRiesgo: 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY ALTO' | string | null;
  estado: string | null;
  tipo: string | null;
  descripcion: string | null;
  sector: string | null;
  macrosector: string | null;
  productos: string | null;
  tamano: string | null;
  direccion: string | null;
  distrito: string | null;
  provincia: string | null;
  departamento: string | null;
  telefonos: string[];
  celulares: string[];
  email: string | null;
  fechaFundacion: string | null;
  locales: number | null;
  trabajadores: number | null;
  origen: string | null;
  paisHolding: string | null;
  estatal: boolean | null;
  privadaPublica: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FacetEntry {
  value: string;
  count: number;
}

export interface Facets {
  sector: FacetEntry[];
  macrosector: FacetEntry[];
  departamento: FacetEntry[];
  provincia: FacetEntry[];
  distrito: FacetEntry[];
  tamano: FacetEntry[];
  riesgo: FacetEntry[];
  estado: FacetEntry[];
  origen: FacetEntry[];
}

export interface Stats {
  total: number;
  conEmail: number;
  conTelefono: number;
  privadas: number;
  porSector: Array<{ sector: string | null; total: number }>;
  porDepartamento: Array<{ departamento: string | null; total: number }>;
  porTamano: Array<{ tamano: string | null; total: number }>;
  porRiesgo: Array<{ riesgo: string | null; total: number }>;
  porTrabajadores: Array<{ rango: string; total: number }>;
}

export interface CompanyFilter {
  q?: string;
  sector?: string[];
  macrosector?: string[];
  departamento?: string[];
  provincia?: string[];
  distrito?: string[];
  tamano?: string[];
  riesgo?: string[];
  estado?: string[];
  origen?: string[];
  estatal?: boolean;
  tieneEmail?: boolean;
  tieneTelefono?: boolean;
  trabajadoresMin?: number;
  trabajadoresMax?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'razonSocial' | 'trabajadores' | 'locales' | 'fechaFundacion';
  sortDir?: 'asc' | 'desc';
}
