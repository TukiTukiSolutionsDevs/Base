import { Injectable } from '@nestjs/common';
import { CompaniesRepository } from '../infrastructure/companies.repository';
import { CompanyDto, PageDto, toCompanyDto } from './dto/company.dto';
import { FilterCompaniesDto } from './dto/filter-companies.dto';

@Injectable()
export class CompaniesService {
  constructor(private readonly repo: CompaniesRepository) {}

  async findPaged(filter: FilterCompaniesDto): Promise<PageDto<CompanyDto>> {
    const { items, total, page, pageSize } = await this.repo.findPaged(filter);
    return {
      items: items.map(toCompanyDto),
      total,
      page,
      pageSize,
      totalPages: pageSize > 0 ? Math.ceil(total / pageSize) : 0,
    };
  }

  facets() {
    return this.repo.facets();
  }

  stats() {
    return this.repo.stats();
  }

  async exportCsv(filter: FilterCompaniesDto): Promise<string> {
    const rows = await this.repo.streamForExport(filter);
    const headers = [
      'ruc', 'razon_social', 'nombre_comercial', 'sector', 'macrosector', 'tamano',
      'trabajadores', 'departamento', 'provincia', 'distrito', 'direccion',
      'telefono_1', 'telefono_2', 'telefono_3', 'celular_1', 'celular_2', 'email',
      'indice_riesgo', 'estado', 'origen', 'pais_holding', 'estatal',
    ];
    const escape = (v: unknown): string => {
      if (v === null || v === undefined) return '';
      const s = String(v).replace(/"/g, '""');
      return /[",\n;]/.test(s) ? `"${s}"` : s;
    };

    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push([
        r.ruc, r.razonSocial, r.nombreComercial, r.sector, r.macrosector, r.tamano,
        r.trabajadores, r.departamento, r.provincia, r.distrito, r.direccion,
        r.telefono1, r.telefono2, r.telefono3, r.celular1, r.celular2, r.email,
        r.indiceRiesgo, r.estado, r.origen, r.paisHolding, r.estatal,
      ].map(escape).join(','));
    }
    return lines.join('\n');
  }
}
