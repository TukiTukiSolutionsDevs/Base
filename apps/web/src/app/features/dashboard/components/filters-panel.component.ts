import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DashboardService } from '../services/dashboard.service';
import { CompanyFilter, FacetEntry } from '../../../core/models/company.model';
import { AttributesChipsComponent } from './attributes-chips.component';
import { FacetSectionComponent } from './facet-section.component';

type FacetKey =
  | 'macrosector'
  | 'sector'
  | 'tamano'
  | 'departamento'
  | 'provincia'
  | 'distrito'
  | 'riesgo'
  | 'origen'
  | 'estado';

interface SectionConfig {
  key: FacetKey;
  label: string;
  defaultOpen: boolean;
}

const SECTIONS: SectionConfig[] = [
  { key: 'macrosector',  label: 'Macrosector',       defaultOpen: true  },
  { key: 'sector',       label: 'Sector',            defaultOpen: true  },
  { key: 'tamano',       label: 'Tamaño',            defaultOpen: true  },
  { key: 'departamento', label: 'Departamento',      defaultOpen: true  },
  { key: 'provincia',    label: 'Provincia',         defaultOpen: false },
  { key: 'distrito',     label: 'Distrito',          defaultOpen: false },
  { key: 'riesgo',       label: 'Índice de riesgo',  defaultOpen: true  },
  { key: 'origen',       label: 'Origen',            defaultOpen: false },
  { key: 'estado',       label: 'Estado',            defaultOpen: false },
];

@Component({
  selector: 'tk-filters-panel',
  standalone: true,
  imports: [FormsModule, AttributesChipsComponent, FacetSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="card p-4 sticky top-[72px] max-h-[calc(100vh-96px)] overflow-y-auto">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold text-ink-800">Filtros</h2>
        @if (hasActiveFilters()) {
          <button type="button" class="btn-link" (click)="reset()">Limpiar todo</button>
        }
      </div>

      <!-- Búsqueda global -->
      <div class="relative mb-4">
        <input
          class="input !pl-9"
          placeholder="Buscar razón social, RUC, comercial..."
          [ngModel]="filter().q ?? ''"
          (ngModelChange)="onSearch($event)" />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400"
             viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
        </svg>
      </div>

      <!-- Atributos accionables (chips toggle) -->
      <tk-attributes-chips />

      <!-- Rango trabajadores -->
      <div class="border-t border-ink-100 mt-4 pt-3">
        <div class="section-label mb-2">Trabajadores</div>
        <div class="flex gap-2">
          <input class="input !py-1.5 text-xs" type="number" min="0" placeholder="min"
                 [ngModel]="filter().trabajadoresMin ?? null"
                 (ngModelChange)="onTrabajadoresMin($event)" />
          <input class="input !py-1.5 text-xs" type="number" min="0" placeholder="max"
                 [ngModel]="filter().trabajadoresMax ?? null"
                 (ngModelChange)="onTrabajadoresMax($event)" />
        </div>
      </div>

      <!-- Facets dinámicos -->
      @for (section of sections; track section.key) {
        <tk-facet-section
          [label]="section.label"
          [options]="optionsFor(section.key)"
          [selected]="selectedFor(section.key)"
          [defaultOpen]="section.defaultOpen"
          (toggle)="onFacetToggle(section.key, $event)" />
      }
    </aside>
  `,
})
export class FiltersPanelComponent {
  private readonly svc = inject(DashboardService);

  readonly filter = this.svc.filter;
  readonly facets = this.svc.facets;
  readonly sections = SECTIONS;

  readonly hasActiveFilters = computed<boolean>(() => {
    const f = this.filter();
    const arrayKeys: FacetKey[] = ['sector', 'macrosector', 'departamento', 'provincia', 'distrito', 'tamano', 'riesgo', 'origen', 'estado'];
    if (arrayKeys.some((k) => (f[k] as string[] | undefined)?.length)) return true;
    return Boolean(
      f.q?.trim() ||
      f.estatal !== undefined ||
      f.tieneEmail !== undefined ||
      f.tieneTelefono !== undefined ||
      f.trabajadoresMin !== undefined ||
      f.trabajadoresMax !== undefined,
    );
  });

  optionsFor(key: FacetKey): FacetEntry[] {
    const f = this.facets();
    return f ? f[key] : [];
  }

  selectedFor(key: FacetKey): Set<string> {
    const arr = this.filter()[key] as string[] | undefined;
    return new Set(arr ?? []);
  }

  onFacetToggle(key: FacetKey, value: string): void {
    this.svc.toggleArrayValue(key as keyof CompanyFilter, value);
  }

  onSearch(q: string): void {
    this.svc.patchFilter({ q: q || undefined });
  }

  onTrabajadoresMin(v: number | null): void {
    this.svc.patchFilter({ trabajadoresMin: v ?? undefined });
  }

  onTrabajadoresMax(v: number | null): void {
    this.svc.patchFilter({ trabajadoresMax: v ?? undefined });
  }

  reset(): void {
    this.svc.resetFilters();
  }
}
