import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Company, CompanyFilter, Facets, Page, Stats } from '../models/company.model';

const API_BASE = '/api';

const buildParams = (filter: CompanyFilter): HttpParams => {
  let p = new HttpParams();
  for (const [k, v] of Object.entries(filter)) {
    if (v === undefined || v === null || v === '') continue;
    if (Array.isArray(v)) {
      for (const item of v) p = p.append(k, String(item));
    } else {
      p = p.set(k, String(v));
    }
  }
  return p;
};

@Injectable({ providedIn: 'root' })
export class CompaniesApi {
  private readonly http = inject(HttpClient);

  list(filter: CompanyFilter): Observable<Page<Company>> {
    return this.http.get<Page<Company>>(`${API_BASE}/companies`, { params: buildParams(filter) });
  }

  facets(): Observable<Facets> {
    return this.http.get<Facets>(`${API_BASE}/companies/facets`);
  }

  stats(): Observable<Stats> {
    return this.http.get<Stats>(`${API_BASE}/companies/stats`);
  }

  exportCsvUrl(filter: CompanyFilter): string {
    const params = buildParams(filter).toString();
    return `${API_BASE}/companies/export.csv${params ? '?' + params : ''}`;
  }
}
