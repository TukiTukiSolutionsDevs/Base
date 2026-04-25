import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

interface BucketRow {
  rango: string;
  total: number;
  pct: number;
  min: number;
  max: number | null;
}

// Orden y rangos de los buckets (deben matchear con el repo del backend)
const BUCKETS: Array<{ label: string; min: number; max: number | null }> = [
  { label: '1-10',     min: 1,    max: 10 },
  { label: '11-50',    min: 11,   max: 50 },
  { label: '51-200',   min: 51,   max: 200 },
  { label: '201-1000', min: 201,  max: 1000 },
  { label: '1000+',    min: 1001, max: null },
];

@Component({
  selector: 'tk-headcount',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card p-4">
      <div class="flex items-baseline justify-between mb-3">
        <div>
          <div class="section-label">Headcount</div>
          <div class="text-[11px] text-ink-400 mt-0.5">distribución de empresas por trabajadores</div>
        </div>
        <div class="text-right">
          <div class="text-sm font-semibold text-ink-700">{{ totalCounted() | number: '1.0-0' }}</div>
          <div class="text-[11px] text-ink-400">empresas</div>
        </div>
      </div>
      <div class="space-y-2">
        @for (b of rows(); track b.rango) {
          <button type="button" class="w-full text-left group" (click)="applyRange(b)">
            <div class="flex items-center justify-between text-sm mb-1">
              <span class="font-medium text-ink-700 group-hover:text-accent-700">{{ b.rango }}</span>
              <span class="text-xs text-ink-500 tabular-nums">
                {{ b.total | number: '1.0-0' }} <span class="text-ink-300">·</span> {{ b.pct }}%
              </span>
            </div>
            <div class="h-2 bg-ink-100 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-accent-400 to-accent-600 transition-all"
                   [style.width.%]="b.pct"></div>
            </div>
          </button>
        }
      </div>
    </div>
  `,
})
export class HeadcountComponent {
  private readonly svc = inject(DashboardService);
  readonly stats = this.svc.stats;

  readonly totalCounted = computed<number>(() => {
    const s = this.stats();
    if (!s) return 0;
    return s.porTrabajadores.reduce((acc, b) => acc + b.total, 0);
  });

  readonly rows = computed<BucketRow[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const tot = this.totalCounted() || 1;
    return BUCKETS.map((b) => {
      const found = s.porTrabajadores.find((p) => p.rango === b.label);
      const total = found?.total ?? 0;
      return {
        rango: b.label,
        total,
        pct: Math.round((total / tot) * 100),
        min: b.min,
        max: b.max,
      };
    });
  });

  applyRange(b: BucketRow): void {
    this.svc.patchFilter({
      trabajadoresMin: b.min,
      trabajadoresMax: b.max ?? undefined,
    });
  }
}
