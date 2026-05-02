import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from './services/dashboard.service';
import { FiltersPanelComponent } from './components/filters-panel.component';
import { CompaniesTableComponent } from './components/companies-table.component';
import { SectorsTreemapComponent } from './components/sectors-treemap.component';
import { RiskDistributionComponent } from './components/risk-distribution.component';
import { HeadcountComponent } from './components/headcount.component';

@Component({
  selector: 'tk-dashboard',
  standalone: true,
  imports: [
    DecimalPipe,
    FiltersPanelComponent,
    CompaniesTableComponent,
    SectorsTreemapComponent,
    RiskDistributionComponent,
    HeadcountComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="h-full overflow-y-auto">
    <div class="max-w-[1400px] mx-auto px-6 py-6">
      <!-- Hero KPIs -->
      <div class="flex items-end justify-between mb-5">
        <div>
          <h1 class="text-2xl font-semibold text-ink-900">Empresas Perú · prospección</h1>
          <p class="text-sm text-ink-500">
            Filtrá por sector, tamaño y ubicación. Exportá CSV con tu lista de targets.
          </p>
        </div>
        @if (loading()) {
          <span class="text-xs text-ink-400 italic">cargando…</span>
        }
      </div>

      <!-- KPIs principales -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="card p-5">
          <div class="section-label">Universo total</div>
          <div class="mt-2 flex items-end gap-2">
            <div class="text-3xl font-semibold text-ink-900">{{ stats()?.total ?? 0 | number: '1.0-0' }}</div>
            <div class="pb-1 text-xs text-ink-400">empresas</div>
          </div>
          <div class="mt-1 text-xs text-ink-400">base completa cargada</div>
        </div>

        <div class="card p-5">
          <div class="section-label">Resultado filtrado</div>
          <div class="mt-2 flex items-end gap-2">
            <div class="text-3xl font-semibold text-accent-600">{{ page().total | number: '1.0-0' }}</div>
            <div class="pb-1 text-xs text-ink-400">empresas</div>
          </div>
          <div class="mt-1 text-xs text-ink-400">{{ filteredPctLabel() }}</div>
        </div>

        <div class="card p-5">
          <div class="section-label">Con email</div>
          <div class="mt-2 flex items-end gap-2">
            <div class="text-3xl font-semibold text-emerald-600">{{ stats()?.conEmail ?? 0 | number: '1.0-0' }}</div>
            <div class="pb-1 text-xs text-ink-400">{{ emailPctLabel() }}</div>
          </div>
          <div class="mt-1 text-xs text-ink-400">contactables por email directo</div>
        </div>

        <div class="card p-5">
          <div class="section-label">Sectores únicos</div>
          <div class="mt-2 flex items-end gap-2">
            <div class="text-3xl font-semibold text-ink-900">{{ (stats()?.porSector?.length ?? 0) | number: '1.0-0' }}</div>
            <div class="pb-1 text-xs text-ink-400">categorías</div>
          </div>
          <div class="mt-1 text-xs text-ink-400">{{ topSectorLabel() }}</div>
        </div>
      </div>

      <!-- Bloque visual: treemap + side cards -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <div class="lg:col-span-2">
          <tk-sectors-treemap />
        </div>
        <div class="space-y-5">
          <tk-risk-distribution />
          <tk-headcount />
        </div>
      </div>

      <!-- Filtros + tabla -->
      <div class="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
        <tk-filters-panel />
        <tk-companies-table />
      </div>
    </div>
    </div>
  `,
})
export class DashboardComponent {
  private readonly svc = inject(DashboardService);

  readonly stats = this.svc.stats;
  readonly page = this.svc.page;
  readonly loading = this.svc.loading;

  readonly emailPctLabel = computed(() => {
    const s = this.stats();
    if (!s || s.total === 0) return '—';
    const pct = Math.round((s.conEmail / s.total) * 100);
    return `${pct}% de la base`;
  });

  readonly filteredPctLabel = computed(() => {
    const s = this.stats();
    const p = this.page();
    if (!s || s.total === 0) return '—';
    const pct = Math.round((p.total / s.total) * 100);
    return `${pct}% del universo total`;
  });

  readonly topSectorLabel = computed(() => {
    const s = this.stats();
    if (!s || !s.porSector.length) return '—';
    const top = s.porSector[0];
    const pct = s.total > 0 ? Math.round((top.total / s.total) * 100) : 0;
    return `top: ${top.sector ?? '—'} · ${pct}%`;
  });
}
