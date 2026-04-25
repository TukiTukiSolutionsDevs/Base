import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

@Component({
  selector: 'tk-companies-table',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card overflow-hidden">
      <div class="flex items-center justify-between px-4 py-3 border-b border-ink-100">
        <div class="text-sm text-ink-600">
          <span class="font-semibold text-ink-900">{{ page().total | number: '1.0-0' }}</span> empresas
          @if (page().total > 0) {
            <span class="text-ink-400">·
              página {{ page().page }} de {{ page().totalPages }}
            </span>
          }
        </div>
        <div class="flex items-center gap-2">
          <a class="btn-ghost text-xs" [href]="exportUrl()" target="_blank" rel="noreferrer">
            <svg class="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 2v9m0 0l-3-3m3 3l3-3M3 13h10" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Exportar CSV
          </a>
          <select class="input !w-auto !py-1 text-xs"
                  [value]="page().pageSize"
                  (change)="onPageSize($event)">
            @for (n of [25, 50, 100, 200]; track n) {
              <option [value]="n">{{ n }} / pág</option>
            }
          </select>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-ink-50 text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th class="text-left px-4 py-2 cursor-pointer select-none" (click)="sortBy('razonSocial')">Empresa {{ sortIcon('razonSocial') }}</th>
              <th class="text-left px-4 py-2">RUC</th>
              <th class="text-left px-4 py-2">Sector</th>
              <th class="text-left px-4 py-2">Ubicación</th>
              <th class="text-left px-4 py-2">Tamaño</th>
              <th class="text-right px-4 py-2 cursor-pointer select-none" (click)="sortBy('trabajadores')">Trab. {{ sortIcon('trabajadores') }}</th>
              <th class="text-left px-4 py-2">Riesgo</th>
              <th class="text-left px-4 py-2">Contacto</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-ink-100">
            @for (c of page().items; track c.id) {
              <tr class="hover:bg-ink-50/60 transition-colors">
                <td class="px-4 py-3">
                  <div class="font-medium text-ink-900 leading-tight">{{ c.razonSocial }}</div>
                  @if (c.nombreComercial) {
                    <div class="text-xs text-ink-400 leading-tight">{{ c.nombreComercial }}</div>
                  }
                </td>
                <td class="px-4 py-3 font-mono text-xs text-ink-600">{{ c.ruc }}</td>
                <td class="px-4 py-3">
                  <div class="text-ink-700">{{ c.sector ?? '—' }}</div>
                  @if (c.macrosector) {
                    <div class="text-[11px] text-ink-400">{{ c.macrosector }}</div>
                  }
                </td>
                <td class="px-4 py-3 text-ink-700">
                  <div>{{ c.distrito ?? '—' }}</div>
                  <div class="text-[11px] text-ink-400">{{ c.provincia }} · {{ c.departamento }}</div>
                </td>
                <td class="px-4 py-3 text-ink-700">{{ c.tamano ?? '—' }}</td>
                <td class="px-4 py-3 text-right text-ink-700 tabular-nums">{{ (c.trabajadores ?? 0) | number: '1.0-0' }}</td>
                <td class="px-4 py-3">
                  <span [class]="riesgoClass(c.indiceRiesgo)">{{ c.indiceRiesgo ?? '—' }}</span>
                </td>
                <td class="px-4 py-3">
                  @if (c.email) {
                    <a class="text-accent-600 hover:underline text-xs" [href]="'mailto:' + c.email">{{ c.email }}</a>
                  }
                  @if (c.telefonos.length) {
                    <div class="text-[11px] text-ink-400">{{ c.telefonos[0] }}</div>
                  } @else if (c.celulares.length) {
                    <div class="text-[11px] text-ink-400">cel: {{ c.celulares[0] }}</div>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="8" class="px-4 py-12 text-center text-ink-400">
                Sin resultados con los filtros actuales.
              </td></tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="flex items-center justify-between px-4 py-3 border-t border-ink-100">
        <div class="text-xs text-ink-400">
          Mostrando {{ rangeStart() }}–{{ rangeEnd() }} de {{ page().total | number: '1.0-0' }}
        </div>
        <div class="flex gap-1">
          <button class="btn-ghost text-xs" [disabled]="page().page <= 1" (click)="go(page().page - 1)">◀</button>
          @for (p of pageNumbers(); track p) {
            @if (p === '…') {
              <span class="px-2 text-ink-400">…</span>
            } @else {
              <button
                type="button"
                class="btn-ghost text-xs"
                [class.bg-accent-100]="p === page().page"
                [class.text-accent-700]="p === page().page"
                (click)="go(+p)">{{ p }}</button>
            }
          }
          <button class="btn-ghost text-xs" [disabled]="page().page >= page().totalPages" (click)="go(page().page + 1)">▶</button>
        </div>
      </div>
    </div>
  `,
})
export class CompaniesTableComponent {
  private readonly svc = inject(DashboardService);

  readonly page = this.svc.page;
  readonly filter = this.svc.filter;
  readonly exportUrl = computed(() => this.svc.exportCsvUrl());

  rangeStart(): number {
    const p = this.page();
    return p.total === 0 ? 0 : (p.page - 1) * p.pageSize + 1;
  }
  rangeEnd(): number {
    const p = this.page();
    return Math.min(p.page * p.pageSize, p.total);
  }

  pageNumbers(): Array<number | '…'> {
    const { page, totalPages } = this.page();
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const out: Array<number | '…'> = [1];
    if (page > 3) out.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) out.push(i);
    if (page < totalPages - 2) out.push('…');
    out.push(totalPages);
    return out;
  }

  go(p: number): void {
    this.svc.setPage(p);
  }

  onPageSize(ev: Event): void {
    const v = Number((ev.target as HTMLSelectElement).value) || 50;
    this.svc.patchFilter({ pageSize: v, page: 1 });
  }

  sortBy(field: 'razonSocial' | 'trabajadores'): void {
    const f = this.filter();
    const dir = f.sortBy === field && f.sortDir === 'asc' ? 'desc' : 'asc';
    this.svc.patchFilter({ sortBy: field, sortDir: dir });
  }

  sortIcon(field: 'razonSocial' | 'trabajadores'): string {
    const f = this.filter();
    if (f.sortBy !== field) return '';
    return f.sortDir === 'asc' ? '▲' : '▼';
  }

  riesgoClass(r: string | null): string {
    switch ((r ?? '').toUpperCase()) {
      case 'BAJO':     return 'chip-bajo';
      case 'MODERADO': return 'chip-moderado';
      case 'ALTO':     return 'chip-alto';
      case 'MUY ALTO': return 'chip-muyalto';
      default:         return 'chip';
    }
  }
}
