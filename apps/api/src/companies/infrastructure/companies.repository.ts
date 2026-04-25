import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { CompanyEntity } from '../domain/company.entity';
import { FilterCompaniesDto, SortableField } from '../application/dto/filter-companies.dto';

const SORT_COLUMN_MAP: Record<SortableField, string> = {
  razonSocial: 'c.razon_social',
  trabajadores: 'c.trabajadores',
  locales: 'c.locales',
  fechaFundacion: 'c.fecha_fundacion',
};

/**
 * Buckets canónicos para distribución de trabajadores ("headcount").
 * Mantenidos como tabla porque se usan tanto en stats como en posibles filtros futuros.
 */
const HEADCOUNT_BUCKETS: Array<{ label: string; min: number; max: number | null }> = [
  { label: '1-10',     min: 1,    max: 10 },
  { label: '11-50',    min: 11,   max: 50 },
  { label: '51-200',   min: 51,   max: 200 },
  { label: '201-1000', min: 201,  max: 1000 },
  { label: '1000+',    min: 1001, max: null },
];

/**
 * Repositorio: encapsula TypeORM. Devuelve entidades, no DTOs.
 * Mantenemos la traducción filter → SQL acá (única fuente de verdad de cómo se filtran las empresas).
 */
@Injectable()
export class CompaniesRepository {
  constructor(
    @InjectRepository(CompanyEntity)
    private readonly repo: Repository<CompanyEntity>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<CompanyEntity>,
    f: FilterCompaniesDto,
  ): SelectQueryBuilder<CompanyEntity> {
    if (f.q && f.q.trim()) {
      qb.andWhere(
        `(c.razon_social ILIKE :q OR c.nombre_comercial ILIKE :q OR c.ruc ILIKE :q)`,
        { q: `%${f.q.trim()}%` },
      );
    }
    if (f.sector?.length)        qb.andWhere('c.sector       IN (:...sector)',       { sector: f.sector });
    if (f.macrosector?.length)   qb.andWhere('c.macrosector  IN (:...macrosector)',  { macrosector: f.macrosector });
    if (f.departamento?.length)  qb.andWhere('c.departamento IN (:...departamento)', { departamento: f.departamento });
    if (f.provincia?.length)     qb.andWhere('c.provincia    IN (:...provincia)',    { provincia: f.provincia });
    if (f.distrito?.length)      qb.andWhere('c.distrito     IN (:...distrito)',     { distrito: f.distrito });
    if (f.tamano?.length)        qb.andWhere('c.tamano       IN (:...tamano)',       { tamano: f.tamano });
    if (f.riesgo?.length)        qb.andWhere('c.indice_riesgo IN (:...riesgo)',      { riesgo: f.riesgo });
    if (f.estado?.length)        qb.andWhere('c.estado       IN (:...estado)',       { estado: f.estado });
    if (f.origen?.length)        qb.andWhere('c.origen       IN (:...origen)',       { origen: f.origen });

    if (f.estatal !== undefined) qb.andWhere('c.estatal = :estatal', { estatal: f.estatal });

    if (f.tieneEmail === true)   qb.andWhere(`c.email IS NOT NULL AND c.email <> ''`);
    if (f.tieneEmail === false)  qb.andWhere(`(c.email IS NULL OR c.email = '')`);

    if (f.tieneTelefono === true) {
      qb.andWhere(`(
        (c.telefono_1 IS NOT NULL AND c.telefono_1 <> '') OR
        (c.telefono_2 IS NOT NULL AND c.telefono_2 <> '') OR
        (c.telefono_3 IS NOT NULL AND c.telefono_3 <> '') OR
        (c.celular_1  IS NOT NULL AND c.celular_1  <> '') OR
        (c.celular_2  IS NOT NULL AND c.celular_2  <> '')
      )`);
    }

    if (f.trabajadoresMin !== undefined) qb.andWhere('c.trabajadores >= :tmin', { tmin: f.trabajadoresMin });
    if (f.trabajadoresMax !== undefined) qb.andWhere('c.trabajadores <= :tmax', { tmax: f.trabajadoresMax });

    return qb;
  }

  async findPaged(
    f: FilterCompaniesDto,
  ): Promise<{ items: CompanyEntity[]; total: number; page: number; pageSize: number }> {
    const page = f.page ?? 1;
    const pageSize = f.pageSize ?? 50;

    const qb = this.repo.createQueryBuilder('c');
    this.applyFilters(qb, f);

    const sortCol = f.sortBy ? SORT_COLUMN_MAP[f.sortBy] : 'c.razon_social';
    const sortDir = (f.sortDir ?? 'asc').toUpperCase() as 'ASC' | 'DESC';
    qb.orderBy(sortCol, sortDir, 'NULLS LAST').addOrderBy('c.id', 'ASC');

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  async streamForExport(f: FilterCompaniesDto): Promise<CompanyEntity[]> {
    const qb = this.repo.createQueryBuilder('c');
    this.applyFilters(qb, f);
    qb.orderBy('c.razon_social', 'ASC');
    return qb.getMany();
  }

  async stats(): Promise<{
    total: number;
    conEmail: number;
    conTelefono: number;
    privadas: number;
    porSector: Array<{ sector: string | null; total: number }>;
    porDepartamento: Array<{ departamento: string | null; total: number }>;
    porTamano: Array<{ tamano: string | null; total: number }>;
    porRiesgo: Array<{ riesgo: string | null; total: number }>;
    porTrabajadores: Array<{ rango: string; total: number }>;
  }> {
    const single = async (sql: string): Promise<number> => {
      const rows = await this.repo.query<Array<{ count: string }>>(sql);
      return Number(rows[0]?.count ?? 0);
    };

    const [total, conEmail, conTelefono, privadas] = await Promise.all([
      single(`SELECT COUNT(*)::text AS count FROM companies`),
      single(`SELECT COUNT(*)::text AS count FROM companies WHERE email IS NOT NULL AND email <> ''`),
      single(`SELECT COUNT(*)::text AS count FROM companies
              WHERE (telefono_1 IS NOT NULL AND telefono_1 <> '')
                 OR (telefono_2 IS NOT NULL AND telefono_2 <> '')
                 OR (telefono_3 IS NOT NULL AND telefono_3 <> '')
                 OR (celular_1  IS NOT NULL AND celular_1  <> '')
                 OR (celular_2  IS NOT NULL AND celular_2  <> '')`),
      single(`SELECT COUNT(*)::text AS count FROM companies WHERE estatal IS NOT TRUE`),
    ]);

    const groupTop = async <K extends string>(col: string, key: K, limit = 50) => {
      const rows = await this.repo.query<Array<{ key: string | null; total: string }>>(
        `SELECT ${col} AS key, COUNT(*)::text AS total
           FROM companies
          WHERE ${col} IS NOT NULL AND ${col} <> ''
          GROUP BY ${col}
          ORDER BY COUNT(*) DESC
          LIMIT $1`,
        [limit],
      );
      return rows.map((r) => ({ [key]: r.key, total: Number(r.total) })) as Array<
        Record<K | 'total', string | null | number>
      >;
    };

    const [porSector, porDepartamento, porTamano, porRiesgo] = await Promise.all([
      groupTop('sector',         'sector',        20),
      groupTop('departamento',   'departamento',  25),
      groupTop('tamano',         'tamano',        20),
      groupTop('indice_riesgo',  'riesgo',        10),
    ]);

    // Headcount: una sola query con CASE
    const bucketCases = HEADCOUNT_BUCKETS.map((b, i) => {
      const cond = b.max === null
        ? `trabajadores >= ${b.min}`
        : `trabajadores BETWEEN ${b.min} AND ${b.max}`;
      return `WHEN ${cond} THEN ${i}`;
    }).join(' ');

    const headcountRows = await this.repo.query<Array<{ idx: string; total: string }>>(
      `SELECT
         (CASE ${bucketCases} ELSE -1 END)::text AS idx,
         COUNT(*)::text AS total
       FROM companies
       WHERE trabajadores IS NOT NULL
       GROUP BY 1
       ORDER BY 1`,
    );
    const porTrabajadores = HEADCOUNT_BUCKETS.map((b, i) => {
      const found = headcountRows.find((r) => Number(r.idx) === i);
      return { rango: b.label, total: Number(found?.total ?? 0) };
    });

    return {
      total, conEmail, conTelefono, privadas,
      porSector: porSector as Array<{ sector: string | null; total: number }>,
      porDepartamento: porDepartamento as Array<{ departamento: string | null; total: number }>,
      porTamano: porTamano as Array<{ tamano: string | null; total: number }>,
      porRiesgo: porRiesgo as Array<{ riesgo: string | null; total: number }>,
      porTrabajadores,
    };
  }

  async facets(): Promise<{
    sector: Array<{ value: string; count: number }>;
    macrosector: Array<{ value: string; count: number }>;
    departamento: Array<{ value: string; count: number }>;
    provincia: Array<{ value: string; count: number }>;
    distrito: Array<{ value: string; count: number }>;
    tamano: Array<{ value: string; count: number }>;
    riesgo: Array<{ value: string; count: number }>;
    estado: Array<{ value: string; count: number }>;
    origen: Array<{ value: string; count: number }>;
  }> {
    const grouped = async (col: string): Promise<Array<{ value: string; count: number }>> => {
      const rows = await this.repo.query<Array<{ value: string | null; count: string }>>(
        `SELECT ${col} AS value, COUNT(*)::text AS count
           FROM companies
          WHERE ${col} IS NOT NULL AND ${col} <> ''
          GROUP BY ${col}
          ORDER BY COUNT(*) DESC, ${col} ASC`,
      );
      return rows
        .filter((r): r is { value: string; count: string } => r.value !== null)
        .map((r) => ({ value: r.value, count: Number(r.count) }));
    };

    const [
      sector, macrosector, departamento, provincia, distrito,
      tamano, riesgo, estado, origen,
    ] = await Promise.all([
      grouped('sector'),
      grouped('macrosector'),
      grouped('departamento'),
      grouped('provincia'),
      grouped('distrito'),
      grouped('tamano'),
      grouped('indice_riesgo'),
      grouped('estado'),
      grouped('origen'),
    ]);

    return { sector, macrosector, departamento, provincia, distrito, tamano, riesgo, estado, origen };
  }
}
