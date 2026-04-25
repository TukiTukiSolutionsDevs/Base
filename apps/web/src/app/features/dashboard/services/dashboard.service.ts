import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, distinctUntilChanged, of, switchMap, tap } from 'rxjs';
import { CompaniesApi } from '../../../core/api/companies.api';
import { Company, CompanyFilter, Facets, Page, Stats } from '../../../core/models/company.model';

const EMPTY_PAGE: Page<Company> = { items: [], total: 0, page: 1, pageSize: 50, totalPages: 0 };

/**
 * Estado del dashboard: filtros + datos derivados (page, facets, stats).
 * Mantenido en signals para evitar boilerplate de RxJS y aprovechar OnPush.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(CompaniesApi);

  // ---- Filtros (estado mutable) -------------------------------------------
  readonly filter = signal<CompanyFilter>({
    page: 1,
    pageSize: 50,
    sortBy: 'razonSocial',
    sortDir: 'asc',
  });

  // ---- Loading flag --------------------------------------------------------
  readonly loading = signal<boolean>(false);

  // ---- Page (resultado de listar empresas) --------------------------------
  // El loading se setea en true al disparar la query y vuelve a false en el tap
  // del resultado (evita escribir signals dentro de effect → NG0600).
  private readonly filter$ = toObservable(this.filter);
  private readonly page$ = this.filter$.pipe(
    debounceTime(180),
    distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b)),
    tap(() => this.loading.set(true)),
    switchMap((f) =>
      this.api.list(f).pipe(
        tap(() => this.loading.set(false)),
        catchError(() => {
          this.loading.set(false);
          return of(EMPTY_PAGE);
        }),
      ),
    ),
  );
  readonly page = toSignal(this.page$, { initialValue: EMPTY_PAGE });

  // ---- Facets (selects) y stats (KPIs) — se cargan una vez ----------------
  private readonly _facets = signal<Facets | null>(null);
  private readonly _stats = signal<Stats | null>(null);
  readonly facets = computed(() => this._facets());
  readonly stats = computed(() => this._stats());

  constructor() {
    this.api.facets().subscribe({
      next: (f) => this._facets.set(f),
      error: () => this._facets.set(null),
    });
    this.api.stats().subscribe({
      next: (s) => this._stats.set(s),
      error: () => this._stats.set(null),
    });
  }

  // ---- Mutators -----------------------------------------------------------
  patchFilter(patch: Partial<CompanyFilter>): void {
    this.filter.update((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));
  }

  resetFilters(): void {
    this.filter.set({ page: 1, pageSize: 50, sortBy: 'razonSocial', sortDir: 'asc' });
  }

  setPage(page: number): void {
    this.filter.update((f) => ({ ...f, page }));
  }

  toggleArrayValue(key: keyof CompanyFilter, value: string): void {
    this.filter.update((f) => {
      const current = (f[key] as string[] | undefined) ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...f, [key]: next.length ? next : undefined, page: 1 };
    });
  }

  exportCsvUrl(): string {
    return this.api.exportCsvUrl(this.filter());
  }
}
