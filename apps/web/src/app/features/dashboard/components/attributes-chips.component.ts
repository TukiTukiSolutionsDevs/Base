import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

interface AttributeChip {
  key: 'tieneEmail' | 'tieneTelefono' | 'soloPrivadas' | 'soloEstatales';
  label: string;
  // valor target del filtro: { tieneEmail: true } / { estatal: false } / etc.
  apply: (svc: DashboardService) => void;
  remove: (svc: DashboardService) => void;
  isActive: (svc: DashboardService) => boolean;
}

const CHIPS: AttributeChip[] = [
  {
    key: 'tieneEmail',
    label: 'con email',
    apply: (s) => s.patchFilter({ tieneEmail: true }),
    remove: (s) => s.patchFilter({ tieneEmail: undefined }),
    isActive: (s) => s.filter().tieneEmail === true,
  },
  {
    key: 'tieneTelefono',
    label: 'con teléfono',
    apply: (s) => s.patchFilter({ tieneTelefono: true }),
    remove: (s) => s.patchFilter({ tieneTelefono: undefined }),
    isActive: (s) => s.filter().tieneTelefono === true,
  },
  {
    key: 'soloPrivadas',
    label: 'privadas',
    apply: (s) => s.patchFilter({ estatal: false }),
    remove: (s) => s.patchFilter({ estatal: undefined }),
    isActive: (s) => s.filter().estatal === false,
  },
  {
    key: 'soloEstatales',
    label: 'estatales',
    apply: (s) => s.patchFilter({ estatal: true }),
    remove: (s) => s.patchFilter({ estatal: undefined }),
    isActive: (s) => s.filter().estatal === true,
  },
];

@Component({
  selector: 'tk-attributes-chips',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <div class="section-label mb-2">Atributos accionables</div>
      <div class="flex flex-wrap gap-2">
        @for (chip of chips; track chip.key) {
          <button
            type="button"
            class="chip-toggle"
            [class.chip-toggle-active]="isActive(chip)"
            (click)="toggle(chip)">
            @if (isActive(chip)) {
              <svg class="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M3 8.5l3.5 3.5L13 5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            }
            {{ chip.label }}
          </button>
        }
      </div>
      @if (countLabel(); as label) {
        <div class="text-[11px] text-ink-400 mt-2">{{ label }}</div>
      }
    </div>
  `,
})
export class AttributesChipsComponent {
  private readonly svc = inject(DashboardService);
  readonly chips = CHIPS;

  readonly stats = this.svc.stats;

  readonly countLabel = computed<string | null>(() => {
    const s = this.stats();
    if (!s || s.total === 0) return null;
    const pct = (n: number) => Math.round((n / s.total) * 100);
    return `con email ${pct(s.conEmail)}% · con tel ${pct(s.conTelefono)}% · privadas ${pct(s.privadas)}%`;
  });

  isActive(chip: AttributeChip): boolean {
    return chip.isActive(this.svc);
  }

  toggle(chip: AttributeChip): void {
    if (chip.isActive(this.svc)) chip.remove(this.svc);
    else chip.apply(this.svc);
  }
}
