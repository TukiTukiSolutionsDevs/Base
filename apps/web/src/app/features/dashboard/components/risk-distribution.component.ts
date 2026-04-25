import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DashboardService } from '../services/dashboard.service';

interface RiskRow {
  level: 'BAJO' | 'MODERADO' | 'ALTO' | 'MUY ALTO' | string;
  total: number;
  pct: number;
  bar: string;     // tailwind class para color de barra
  dot: string;     // tailwind class para dot
}

const RISK_ORDER = ['BAJO', 'MODERADO', 'ALTO', 'MUY ALTO'] as const;

const RISK_STYLES: Record<string, { bar: string; dot: string }> = {
  'BAJO':     { bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
  'MODERADO': { bar: 'bg-amber-500',   dot: 'bg-amber-500' },
  'ALTO':     { bar: 'bg-orange-500',  dot: 'bg-orange-500' },
  'MUY ALTO': { bar: 'bg-rose-500',    dot: 'bg-rose-500' },
};

@Component({
  selector: 'tk-risk-distribution',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card p-4">
      <div class="flex items-baseline justify-between mb-3">
        <div class="section-label">Por riesgo</div>
        <div class="text-right">
          <div class="text-sm font-semibold text-ink-700">{{ total() | number: '1.0-0' }}</div>
          <div class="text-[11px] text-ink-400">total</div>
        </div>
      </div>
      <div class="space-y-3">
        @for (r of rows(); track r.level) {
          <button type="button" class="w-full text-left group" (click)="filter(r.level)">
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2 text-sm">
                <span class="w-1.5 h-1.5 rounded-full" [class]="r.dot"></span>
                <span class="font-medium text-ink-700 group-hover:text-accent-700">{{ r.level }}</span>
              </div>
              <div class="text-xs text-ink-500 tabular-nums">
                {{ r.total | number: '1.0-0' }} <span class="text-ink-300">·</span> {{ r.pct }}%
              </div>
            </div>
            <div class="h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div class="h-full transition-all" [class]="r.bar" [style.width.%]="r.pct"></div>
            </div>
          </button>
        }
      </div>
    </div>
  `,
})
export class RiskDistributionComponent {
  private readonly svc = inject(DashboardService);
  readonly stats = this.svc.stats;

  readonly total = computed<number>(() => this.stats()?.total ?? 0);

  readonly rows = computed<RiskRow[]>(() => {
    const s = this.stats();
    if (!s) return [];
    const total = s.total || 1;

    // Mantener orden canónico BAJO → MODERADO → ALTO → MUY ALTO
    return RISK_ORDER.map((level) => {
      const found = s.porRiesgo.find((r) => r.riesgo === level);
      const totalCount = found?.total ?? 0;
      const style = RISK_STYLES[level] ?? RISK_STYLES['BAJO'];
      return {
        level,
        total: totalCount,
        pct: Math.round((totalCount / total) * 100),
        bar: style.bar,
        dot: style.dot,
      };
    }).filter((r) => r.total > 0);
  });

  filter(level: string): void {
    this.svc.patchFilter({ riesgo: [level] });
  }
}
