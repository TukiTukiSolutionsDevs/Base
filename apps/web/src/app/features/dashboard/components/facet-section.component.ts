import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FacetEntry } from '../../../core/models/company.model';

const COLLAPSED_LIMIT = 5;

/**
 * Sección colapsable de filtros (un facet) con:
 *  - búsqueda interna (visible si hay >5 opciones)
 *  - "Ver los N" (expand) / "Ver menos"
 *  - count al lado de cada opción
 *  - selected count en el header
 */
@Component({
  selector: 'tk-facet-section',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="border-t border-ink-100 py-3">
      <button
        type="button"
        class="w-full flex items-center justify-between section-label hover:text-ink-700"
        (click)="toggleOpen()">
        <span class="flex items-center gap-2">
          {{ label() }}
          @if (selectedCount() > 0) {
            <span class="text-[10px] font-semibold text-accent-600 bg-accent-100 px-1.5 py-0.5 rounded-full">
              {{ selectedCount() }}/{{ options().length }}
            </span>
          }
        </span>
        <span class="text-ink-300 text-base leading-none">{{ open() ? '−' : '+' }}</span>
      </button>

      @if (open()) {
        <div class="mt-2">
          @if (options().length > COLLAPSED_LIMIT) {
            <div class="relative mb-2">
              <input
                class="input !py-1.5 !pl-7 text-xs"
                placeholder="Filtrar {{ label().toLowerCase() }}..."
                [(ngModel)]="search" />
              <svg class="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400"
                   viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
              </svg>
            </div>
          }

          <div class="space-y-1 max-h-64 overflow-y-auto pr-1">
            @for (opt of visibleOptions(); track opt.value) {
              <label class="flex items-center justify-between gap-2 text-sm hover:bg-ink-50 rounded px-1 py-1 cursor-pointer">
                <span class="flex items-center gap-2 min-w-0">
                  <input type="checkbox"
                         class="rounded border-ink-300 text-accent-600 focus:ring-accent-400"
                         [checked]="selected().has(opt.value)"
                         (change)="onToggle(opt.value)" />
                  <span class="truncate text-ink-700">{{ opt.value }}</span>
                </span>
                <span class="text-xs text-ink-400 tabular-nums shrink-0">
                  {{ opt.count | number: '1.0-0' }}
                </span>
              </label>
            } @empty {
              <div class="text-xs text-ink-400 italic px-1 py-2">
                @if (search()) {
                  Sin coincidencias para "{{ search() }}"
                } @else {
                  — sin opciones
                }
              </div>
            }
          </div>

          @if (canExpand()) {
            <button type="button" class="btn-link mt-2" (click)="expanded.set(true)">
              Ver los {{ filteredOptions().length }}
            </button>
          } @else if (expanded() && filteredOptions().length > COLLAPSED_LIMIT) {
            <button type="button" class="btn-link mt-2" (click)="expanded.set(false)">
              Ver menos
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class FacetSectionComponent {
  readonly label = input.required<string>();
  readonly options = input.required<FacetEntry[]>();
  readonly selected = input.required<Set<string>>();
  readonly defaultOpen = input<boolean>(false);

  readonly toggle = output<string>();

  readonly open = signal<boolean>(false);
  readonly expanded = signal<boolean>(false);
  readonly search = signal<string>('');

  readonly COLLAPSED_LIMIT = COLLAPSED_LIMIT;

  constructor() {
    // Inicializa el estado open desde defaultOpen
    queueMicrotask(() => this.open.set(this.defaultOpen()));
  }

  readonly selectedCount = computed<number>(() => this.selected().size);

  readonly filteredOptions = computed<FacetEntry[]>(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.options();
    return this.options().filter((o) => o.value.toLowerCase().includes(q));
  });

  readonly visibleOptions = computed<FacetEntry[]>(() => {
    const all = this.filteredOptions();
    if (this.expanded() || all.length <= COLLAPSED_LIMIT) return all;
    return all.slice(0, COLLAPSED_LIMIT);
  });

  readonly canExpand = computed<boolean>(() =>
    !this.expanded() && this.filteredOptions().length > COLLAPSED_LIMIT,
  );

  toggleOpen(): void {
    this.open.update((v) => !v);
  }

  onToggle(value: string): void {
    this.toggle.emit(value);
  }
}
