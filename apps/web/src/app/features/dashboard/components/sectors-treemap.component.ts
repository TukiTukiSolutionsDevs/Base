import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

interface TreemapTile {
  sector: string;
  total: number;
  pct: number;       // porcentaje sobre el universo total
  cls: string;       // clases tailwind para el tile
  hue: number;       // 0..1 para tonalidad
}

/**
 * Layout fijo de mosaico para los top 11 sectores (no es un treemap "squarified" real,
 * es un tiled-mosaic con áreas predefinidas que se ven bien con la distribución típica
 * del dataset peruano: un sector dominante + ~10 secundarios).
 *
 * Si el dataset tiene <11 sectores, las celdas extra quedan como huecos.
 */
const TILE_SLOTS: string[] = [
  // index → clases de grid-area
  'col-span-3 row-span-3', // 0: top dominante (mitad izquierda)
  'col-span-2 row-span-2', // 1
  'col-span-1 row-span-2', // 2
  'col-span-1 row-span-1', // 3
  'col-span-2 row-span-1', // 4
  'col-span-3 row-span-1', // 5
  'col-span-2 row-span-1', // 6
  'col-span-1 row-span-1', // 7
  'col-span-2 row-span-1', // 8
  'col-span-2 row-span-1', // 9
  'col-span-1 row-span-1', // 10
];

@Component({
  selector: 'tk-sectors-treemap',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card p-4">
      <div class="flex items-baseline justify-between mb-3">
        <div>
          <div class="section-label">Sectores · top 11</div>
          <div class="text-sm text-ink-500 mt-0.5">
            Comercializadoras y transporte concentran <span class="font-semibold text-ink-700">{{ top2Pct() }}%</span> del universo.
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-ink-400">total filtrado</div>
          <div class="text-sm font-semibold text-ink-700">{{ totalUniverse() | number: '1.0-0' }}</div>
        </div>
      </div>

      <div class="grid grid-cols-6 grid-rows-5 gap-2 h-[340px]">
        @for (tile of tiles(); track tile.sector; let i = $index) {
          <button
            type="button"
            [class]="'rounded-xl text-left p-3 transition-transform hover:scale-[1.01] hover:z-10 relative overflow-hidden ' + tile.cls"
            [style.background]="bgFor(tile, i)"
            [style.color]="textColorFor(i)"
            (click)="filterBy(tile.sector)">
            <div class="text-[10px] uppercase tracking-wide opacity-80 truncate">{{ tile.sector }}</div>
            <div class="text-2xl font-bold leading-tight mt-1">{{ tile.total | number: '1.0-0' }}</div>
            <div class="text-[11px] opacity-75">{{ tile.pct }}% de la base</div>
          </button>
        }
      </div>
    </div>
  `,
})
export class SectorsTreemapComponent {
  private readonly svc = inject(DashboardService);

  readonly stats = this.svc.stats;

  readonly totalUniverse = computed<number>(() => this.stats()?.total ?? 0);

  readonly tiles = computed<TreemapTile[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const total = s.total || 1;
    return s.porSector.slice(0, TILE_SLOTS.length).map((row, i) => ({
      sector: row.sector ?? '—',
      total: row.total,
      pct: Math.round((row.total / total) * 100),
      cls: TILE_SLOTS[i],
      hue: i / TILE_SLOTS.length,
    }));
  });

  readonly top2Pct = computed<number>(() => {
    const t = this.tiles();
    if (t.length < 2) return t[0]?.pct ?? 0;
    return t[0].pct + t[1].pct;
  });

  bgFor(_tile: TreemapTile, i: number): string {
    // Gradiente en la familia accent (violeta) + acentos cálidos para los pequeños
    const palette = [
      'linear-gradient(135deg, #4a4ef5 0%, #2c2d83 100%)', // top
      'linear-gradient(135deg, #5d61ff 0%, #4a4ef5 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #7b80ff 0%, #5d61ff 100%)',
      'linear-gradient(135deg, #9aa1ff 0%, #7b80ff 100%)',
      'linear-gradient(135deg, #4a4ef5 0%, #5d61ff 100%)',
      'linear-gradient(135deg, #c0c5ff 0%, #9aa1ff 100%)',
      'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
      'linear-gradient(135deg, #c0c5ff 0%, #9aa1ff 100%)',
      'linear-gradient(135deg, #dee1ff 0%, #c0c5ff 100%)',
      'linear-gradient(135deg, #eef0ff 0%, #dee1ff 100%)',
    ];
    return palette[i] ?? palette[palette.length - 1];
  }

  textColorFor(i: number): string {
    // Los tiles oscuros (0,1,2,3,5) llevan texto blanco; los claros (4,6,9,10) llevan ink-800
    const dark = new Set([0, 1, 2, 3, 5, 7]);
    return dark.has(i) ? '#ffffff' : '#1c1f2e';
  }

  filterBy(sector: string): void {
    this.svc.patchFilter({ sector: [sector] });
  }
}
