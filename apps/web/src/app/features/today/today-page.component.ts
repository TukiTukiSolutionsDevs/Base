import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { TypeIconComponent } from '../../shared/components/type-icon/type-icon.component';
import { STAGE_STYLES } from '../../shared/components/stage-pill/stage-pill.component';
import { TodayApiService } from '../../core/api/today-api.service';
import { TasksApiService } from '../../core/api/tasks-api.service';
import { AuthService } from '../../core/auth/auth.service';
import {
  PipelineStatus, PIPELINE_STAGES, TodayAlerts, TaskItem,
} from '../../core/api/types';
import { fmtTime, relTime } from '../../shared/utils/date-helpers';
import { ToastService } from '../../shared/services/toast.service';

interface SmartPrompt {
  id: string;
  kind: 'overdue-followup' | 'cold-proposal' | 'stale-entry';
  severity: 'high' | 'mid' | 'info';
  icon: string;
  title: string;
  detail: string;
  cta: string;
  entryId?: string;
}

@Component({
  selector: 'tk-today-page',
  standalone: true,
  imports: [IconComponent, AvatarComponent, TypeIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tk-today">
      <!-- Hero declarativo -->
      <section class="tk-hero">
        <div class="tk-hero-meta">
          <span>{{ todayLabel() }}</span>
          <span class="dot"></span>
          <span>{{ timeLabel() }} — Lima</span>
        </div>
        <h1 class="tk-hero-title">
          @if (greeting(); as g) {
            {{ g }},
          }
          @if (firstName(); as fn) {
            <span>{{ fn }}.</span>
          }
          @if (pendingTasks() > 0) {
            Tenés <span class="hl">{{ pendingTasks() }} acciones pendientes</span> hoy.
          } @else {
            Tu día está limpio. ¡Aprovechá!
          }
          @if (overdueCount() > 0) {
            {{ overdueCount() }} follow-ups vencidos,
          }
          @if (coldProposals() > 0) {
            {{ coldProposals() }} propuesta{{ coldProposals() > 1 ? 's' : '' }} sin respuesta hace +7 días,
          }
          @if (firstMeeting(); as m) {
            1 reunión a las {{ fmtTime(m.dueAt) }}.
          }
        </h1>
      </section>

      <!-- Snapshot pipeline -->
      <section>
        <header class="tk-section-h">
          <div class="tk-section-h-l">
            <h2>Tu pipeline</h2>
            <p>{{ activeCount() }} cuentas activas · {{ totalCount() }} totales</p>
          </div>
        </header>
        <div class="tk-snapshot-grid">
          @for (s of snapshotStages(); track s.id) {
            <button class="snapshot-card" (click)="goToPipeline(s.id)">
              <div class="head">
                <span class="dot" [style.background]="s.dot"></span>
                <span>{{ s.label }}</span>
              </div>
              <div class="big tnum">
                <span class="num">{{ s.count }}</span>
                <span class="lbl">cuentas</span>
              </div>
            </button>
          }
        </div>
      </section>

      <!-- Smart prompts -->
      @if (smartPrompts().length > 0) {
        <section class="tk-block">
          <header class="tk-section-h">
            <div class="tk-section-h-l">
              <div class="t-row">
                <tk-icon name="spark" [size]="14" style="color:var(--c-cobalt-500)" />
                <h2>Alertas inteligentes</h2>
              </div>
              <p>Lo que el sistema detectó por vos</p>
            </div>
          </header>
          <div class="tk-prompt-list">
            @for (p of smartPrompts(); track p.id) {
              <div class="tk-prompt" [attr.data-sev]="p.severity">
                <div class="ic">
                  <tk-icon [name]="p.icon" [size]="18" />
                </div>
                <div class="body">
                  <div class="tt">{{ p.title }}</div>
                  <div class="dt">{{ p.detail }}</div>
                </div>
                <button class="cta" (click)="handlePromptCta(p)">
                  {{ p.cta }}
                  <tk-icon name="chevron-right" [size]="12" />
                </button>
              </div>
            }
          </div>
        </section>
      }

      <!-- Tareas + actividad -->
      <div class="tk-grid-2">
        <section>
          <header class="tk-section-h">
            <div class="tk-section-h-l">
              <h2>Tareas para hoy</h2>
              <p>{{ pendingTasks() }} pendientes · {{ doneTasks() }} completas</p>
            </div>
          </header>
          <div class="tk-tasks">
            @if (todayTasks().length === 0) {
              <div class="tk-empty">No hay tareas para hoy.</div>
            }
            @for (t of todayTasks(); track t.id; let last = $last) {
              <div class="tk-task" [class.is-last]="last">
                <button class="check" [class.is-done]="t.completed"
                        (click)="onCompleteTask(t)" type="button"
                        [attr.aria-label]="t.completed ? 'Reabrir' : 'Completar'">
                  @if (t.completed) { <tk-icon name="check" [size]="12" /> }
                </button>
                <tk-type-icon [kind]="t.type" [size]="14" />
                <button class="body" (click)="openEntry(t.pipelineEntryId)" type="button">
                  <span class="desc" [class.is-done]="t.completed">{{ t.description }}</span>
                  <span class="sub">{{ t.pipelineEntry?.companyName ?? t.pipelineEntry?.company?.razonSocial ?? '—' }}</span>
                </button>
                @if (t.overdue && !t.completed) {
                  <span class="badge over">vencida hace {{ t.overdueDays ?? '—' }}d</span>
                }
                <span class="mono time">{{ fmtTime(t.dueAt) }}</span>
                <tk-icon name="chevron-right" [size]="14" style="color:var(--t-tertiary)" />
              </div>
            }
          </div>
        </section>

        <section>
          <header class="tk-section-h">
            <div class="tk-section-h-l">
              <h2>Últimas interacciones</h2>
              <p>Tu actividad reciente</p>
            </div>
          </header>
          <div class="tk-recents">
            @if (recents().length === 0) {
              <div class="tk-empty">Sin actividad reciente.</div>
            }
            @for (a of recents(); track a.id) {
              <button class="tk-recent" (click)="openEntry(a.pipelineEntryId)">
                <tk-type-icon [kind]="a.type" [size]="14" />
                <div class="body">
                  <div class="tt">{{ a.summary }}</div>
                  <div class="sub">{{ a.companyName }} · {{ relTime(a.occurredAt) }}</div>
                </div>
              </button>
            }
          </div>
        </section>
      </div>

      @if (loading()) {
        <div class="tk-loading">Cargando tu día…</div>
      }
      @if (loadError()) {
        <div class="tk-error">No pudimos cargar las alertas: {{ loadError() }}</div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; overflow: auto; }
    .tk-today { padding: 32px 40px 64px; max-width: 1240px; margin: 0 auto; }
    .tk-hero { margin-bottom: 40px; }
    .tk-hero-meta {
      display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px;
      font-size: 12px; color: var(--t-tertiary); text-transform: uppercase;
      letter-spacing: 0.08em; font-weight: 500;
    }
    .tk-hero-meta .dot { width: 4px; height: 4px; border-radius: 2px; background: var(--c-ink-300); display: inline-block; }
    .tk-hero-title {
      font-family: var(--font-display); font-size: 36px; font-weight: 600;
      letter-spacing: -0.02em; line-height: 1.2; margin: 0;
      color: var(--t-primary); max-width: 880px;
    }
    .tk-hero-title .hl { color: var(--c-cobalt-500); }

    .tk-section-h {
      display: flex; align-items: flex-end; justify-content: space-between;
      margin-bottom: 14px; gap: 12px;
    }
    .tk-section-h-l h2 {
      margin: 0; font-family: var(--font-display);
      font-size: 18px; font-weight: 600; color: var(--t-primary);
      letter-spacing: -0.01em; line-height: 1.3;
    }
    .tk-section-h-l p { margin: 4px 0 0; font-size: 12px; color: var(--t-tertiary); }
    .tk-section-h-l .t-row { display: flex; align-items: center; gap: 8px; }

    .tk-snapshot-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
    .snapshot-card {
      display: flex; flex-direction: column; gap: 8px;
      padding: 16px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--r-lg);
      text-align: left;
      transition: all var(--dur-base) var(--ease-out);
      cursor: pointer;
    }
    .snapshot-card .head {
      display: flex; align-items: center; gap: 8px; white-space: nowrap;
      font-size: 11px; font-weight: 500; color: var(--t-secondary);
    }
    .snapshot-card .head .dot { width: 8px; height: 8px; border-radius: 4px; flex-shrink: 0; }
    .snapshot-card .big { display: flex; align-items: baseline; gap: 6px; }
    .snapshot-card .num {
      font-family: var(--font-display); font-size: 28px; font-weight: 600;
      color: var(--t-primary); letter-spacing: -0.02em; line-height: 1;
    }
    .snapshot-card .lbl { font-size: 11px; color: var(--t-tertiary); }

    .tk-block { margin-top: 40px; }
    .tk-prompt-list { display: grid; gap: 10px; }
    .tk-prompt {
      display: flex; align-items: center; gap: 16px;
      padding: 14px 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--r-lg);
    }
    .tk-prompt[data-sev="high"] { border-left: 3px solid var(--c-risk-high); }
    .tk-prompt[data-sev="mid"]  { border-left: 3px solid var(--c-risk-mid); }
    .tk-prompt[data-sev="info"] { border-left: 3px solid var(--c-info); }
    .tk-prompt .ic {
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .tk-prompt[data-sev="high"] .ic { background: var(--c-risk-high-bg); color: var(--c-risk-high); }
    .tk-prompt[data-sev="mid"]  .ic { background: var(--c-risk-mid-bg);  color: var(--c-risk-mid); }
    .tk-prompt[data-sev="info"] .ic { background: var(--c-info-bg);      color: var(--c-info); }
    .tk-prompt .body { flex: 1; min-width: 0; }
    .tk-prompt .body .tt { font-size: 13px; font-weight: 600; color: var(--t-primary); margin-bottom: 2px; }
    .tk-prompt .body .dt { font-size: 12px; color: var(--t-secondary); }
    .tk-prompt .cta {
      display: inline-flex; align-items: center; gap: 6px;
      height: 28px; padding: 0 12px;
      border: 1px solid var(--border-default);
      background: var(--bg-surface); color: var(--t-primary);
      border-radius: var(--r-md);
      font-size: 12px; font-weight: 500;
      cursor: pointer;
    }
    .tk-prompt .cta:hover { background: var(--bg-hover); }

    .tk-grid-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 32px; margin-top: 40px; }

    .tk-tasks {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--r-lg);
      overflow: hidden;
    }
    .tk-task {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--border-subtle);
      background: transparent;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .tk-task.is-last { border-bottom: 0; }
    .tk-task:hover { background: var(--bg-hover); }
    .tk-task .check {
      width: 18px; height: 18px; border-radius: 4px;
      border: 1.5px solid var(--border-strong);
      background: transparent;
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0; cursor: pointer;
    }
    .tk-task .check.is-done {
      border-color: var(--c-cobalt-500);
      background: var(--c-cobalt-500);
    }
    .tk-task .body {
      flex: 1; min-width: 0; text-align: left;
      display: flex; flex-direction: column; gap: 2px;
      background: transparent; border: 0; cursor: pointer; padding: 0;
    }
    .tk-task .body .desc { font-size: 13px; color: var(--t-primary); font-weight: 500; }
    .tk-task .body .desc.is-done { color: var(--t-tertiary); text-decoration: line-through; }
    .tk-task .body .sub { font-size: 11px; color: var(--t-tertiary); }
    .tk-task .badge {
      font-size: 11px; font-weight: 500;
      padding: 2px 8px; border-radius: 999px;
    }
    .tk-task .badge.over { background: var(--c-risk-high-bg); color: var(--c-risk-high); }
    .tk-task .time { font-size: 11px; color: var(--t-secondary); font-weight: 500; }

    .tk-recents {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--r-lg);
      padding: 8px 4px;
    }
    .tk-recent {
      width: 100%;
      display: flex; gap: 10px; align-items: flex-start;
      padding: 10px 12px;
      border-radius: 8px;
      text-align: left; background: transparent; border: 0;
      cursor: pointer;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .tk-recent:hover { background: var(--bg-hover); }
    .tk-recent .body { flex: 1; min-width: 0; }
    .tk-recent .tt { font-size: 12px; color: var(--t-primary); font-weight: 500; margin-bottom: 2px; }
    .tk-recent .sub { font-size: 11px; color: var(--t-tertiary); }

    .tk-empty { padding: 16px; font-size: 13px; color: var(--t-tertiary); text-align: center; }
    .tk-loading, .tk-error { margin-top: 16px; font-size: 12px; color: var(--t-tertiary); text-align: center; }
    .tk-error { color: var(--c-risk-high); }

    @media (max-width: 960px) {
      .tk-snapshot-grid { grid-template-columns: repeat(3, 1fr); }
      .tk-grid-2 { grid-template-columns: 1fr; }
    }
  `],
})
export class TodayPageComponent {
  private readonly todayApi = inject(TodayApiService);
  private readonly tasksApi = inject(TasksApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly fmtTime = fmtTime;
  readonly relTime = relTime;

  /* Data */
  private readonly _alerts = signal<TodayAlerts | null>(null);
  private readonly _tasks = signal<TaskItem[]>([]);
  readonly loading = signal<boolean>(true);
  readonly loadError = signal<string | null>(null);

  readonly alerts = computed(() => this._alerts());
  readonly todayTasks = computed(() => this._tasks());

  /* Derivados */
  readonly pendingTasks = computed(() => this._tasks().filter(t => !t.completed).length);
  readonly doneTasks = computed(() => this._tasks().filter(t => t.completed).length);
  readonly overdueCount = computed(() => this.alerts()?.overdueFollowUps?.length ?? 0);
  readonly coldProposals = computed(() => this.alerts()?.coldProposals?.length ?? 0);
  readonly firstMeeting = computed(() => this.alerts()?.todayMeetings?.[0] ?? null);
  readonly recents = computed(() => this.alerts()?.recentInteractions ?? []);

  readonly snapshotStages = computed(() => {
    const snap = this.alerts()?.pipelineSnapshot ?? [];
    const map = new Map<PipelineStatus, number>();
    for (const s of snap) map.set(s.status, s.count);
    return PIPELINE_STAGES.map(s => ({
      id: s.id,
      label: s.label,
      count: map.get(s.id) ?? 0,
      dot: STAGE_STYLES[s.id].dot,
    }));
  });

  readonly activeCount = computed(() =>
    this.snapshotStages().filter(s => s.id !== 'WON' && s.id !== 'LOST').reduce((a, b) => a + b.count, 0)
  );
  readonly totalCount = computed(() =>
    this.snapshotStages().reduce((a, b) => a + b.count, 0)
  );

  readonly smartPrompts = computed<SmartPrompt[]>(() => {
    const a = this.alerts();
    if (!a) return [];
    const out: SmartPrompt[] = [];
    if (a.overdueFollowUps?.length) {
      out.push({
        id: 'overdue', kind: 'overdue-followup', severity: 'high', icon: 'alert-tri',
        title: `${a.overdueFollowUps.length} follow-up${a.overdueFollowUps.length > 1 ? 's' : ''} vencido${a.overdueFollowUps.length > 1 ? 's' : ''}`,
        detail: a.overdueFollowUps[0]!.companyName + (a.overdueFollowUps.length > 1 ? ` y ${a.overdueFollowUps.length - 1} más` : '') + ' · sin respuesta',
        cta: 'Ver',
        entryId: a.overdueFollowUps[0]!.pipelineEntryId,
      });
    }
    if (a.coldProposals?.length) {
      out.push({
        id: 'cold', kind: 'cold-proposal', severity: 'mid', icon: 'snow',
        title: `${a.coldProposals.length} propuesta${a.coldProposals.length > 1 ? 's' : ''} fría${a.coldProposals.length > 1 ? 's' : ''}`,
        detail: 'Más de 7 días sin respuesta. ¿Volvés a tocar?',
        cta: 'Abrir',
        entryId: a.coldProposals[0]!.pipelineEntryId,
      });
    }
    if (a.staleEntries?.length) {
      out.push({
        id: 'stale', kind: 'stale-entry', severity: 'info', icon: 'clock',
        title: `${a.staleEntries.length} cuenta${a.staleEntries.length > 1 ? 's' : ''} sin movimiento`,
        detail: 'Más de 30 días en el mismo estado.',
        cta: 'Revisar',
        entryId: a.staleEntries[0]!.pipelineEntryId,
      });
    }
    return out;
  });

  /* Saludo */
  readonly firstName = computed(() => {
    const u = this.auth.user();
    return u?.displayName?.split(' ')[0] ?? null;
  });
  readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buen día' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });
  readonly todayLabel = computed(() => {
    const d = new Date();
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  });
  readonly timeLabel = computed(() => {
    const d = new Date();
    return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  });

  constructor() {
    let pendingAlerts = true;
    let pendingTasks = true;
    const settle = () => { if (!pendingAlerts && !pendingTasks) this.loading.set(false); };

    this.todayApi.getAlertsSummary()
      .pipe(catchError((err) => { this.loadError.set(this.errorOf(err)); return of(null); }))
      .subscribe((a) => { this._alerts.set(a); pendingAlerts = false; settle(); });

    this.tasksApi.today()
      .pipe(catchError((err) => { this.loadError.set(this.errorOf(err)); return of([] as TaskItem[]); }))
      .subscribe((t) => { this._tasks.set(t); pendingTasks = false; settle(); });
  }

  private errorOf(err: unknown): string {
    if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
    return 'Error desconocido';
  }

  goToPipeline(status: PipelineStatus): void {
    this.router.navigate(['/pipeline'], { queryParams: { status } });
  }

  openEntry(entryId: string | null | undefined): void {
    if (!entryId) return;
    this.router.navigate(['/pipeline'], { queryParams: { entryId } });
  }

  onCompleteTask(t: TaskItem): void {
    if (t.completed) return;
    /* Optimistic */
    this._tasks.update(xs => xs.map(x => x.id === t.id ? { ...x, completed: true, completedAt: new Date().toISOString() } : x));
    this.tasksApi.complete(t.id).subscribe({
      next: () => this.toast.success('Tarea completada'),
      error: () => {
        /* rollback */
        this._tasks.update(xs => xs.map(x => x.id === t.id ? { ...x, completed: false, completedAt: null } : x));
        this.toast.error('No se pudo completar');
      },
    });
  }

  handlePromptCta(p: SmartPrompt): void {
    if (p.entryId) this.openEntry(p.entryId);
  }
}
