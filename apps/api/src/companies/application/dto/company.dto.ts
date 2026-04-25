import { CompanyEntity } from '../../domain/company.entity';

export interface CompanyDto {
  id: string;
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  indiceRiesgo: string | null;
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

export interface PageDto<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const compact = (...arr: (string | null)[]): string[] =>
  arr.filter((s): s is string => !!s && s.trim() !== '');

export const toCompanyDto = (e: CompanyEntity): CompanyDto => ({
  id: e.id,
  ruc: e.ruc,
  razonSocial: e.razonSocial,
  nombreComercial: e.nombreComercial,
  indiceRiesgo: e.indiceRiesgo,
  estado: e.estado,
  tipo: e.tipo,
  descripcion: e.descripcion,
  sector: e.sector,
  macrosector: e.macrosector,
  productos: e.productos,
  tamano: e.tamano,
  direccion: e.direccion,
  distrito: e.distrito,
  provincia: e.provincia,
  departamento: e.departamento,
  telefonos: compact(e.telefono1, e.telefono2, e.telefono3),
  celulares: compact(e.celular1, e.celular2),
  email: e.email,
  fechaFundacion: e.fechaFundacion,
  locales: e.locales,
  trabajadores: e.trabajadores,
  origen: e.origen,
  paisHolding: e.paisHolding,
  estatal: e.estatal,
  privadaPublica: e.privadaPublica,
});
