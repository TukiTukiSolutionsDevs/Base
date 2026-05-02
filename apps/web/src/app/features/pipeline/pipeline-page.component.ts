import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';
import { TypeIconComponent } from '../../shared/components/type-icon/type-icon.component';
import { StagePillComponent, STAGE_STYLES } from '../../shared/components/stage-pill/stage-pill.component';
import { CompanyDrawerComponent } from './components/company-drawer/company-drawer.component';
import { InteractionModalComponent } from './components/interaction-modal/interaction-modal.component';
import { TaskModalComponent } from './components/task-modal/task-modal.component';
import { ConfirmStageModalComponent } from './components/confirm-stage-modal/confirm-stage-modal.component';
import { PipelineApiService } from '../../core/api/pipeline-api.service';
import { InteractionsApiService } from '../../core/api/interactions-api.service';
import { TasksApiService } from '../../core/api/tasks-api.service';
import {
  PIPELINE_STAGES, PipelineEntry, PipelineStatus, STAGE_BY_ID, TaskItem,
} from '../../core/api/types';
import { fmtDate, relTime } from '../../shared/utils/date-helpers';
import { ToastService } from '../../shared/services/toast.service';

type ViewMode = 'kanban' | 'list';

@Component({
  selector: 'tk-pipeline-page',
  standalone: true,
  imports: [
    DragDropModule, IconComponent, AvatarComponent, TypeIconComponent, StagePillComponent,
    CompanyDrawerComponent, InteractionModalComponent, TaskModalComponent, ConfirmStageModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tk-pipeline">
      <!-- Toolbar -->
      <div class="tk-toolbar">
        <div class="tk-viewtoggle">
          <button type="button" [class.is-active]="view() === 'kanban'" (click)="view.set('kanban')">
            <tk-icon name="kanban" [size]="13" />Kanban
          </button>
          <button type="button" [class.is-active]="view() === 'list'" (click)="view.set('list')">
            <tk-icon name="list" [size]="13" />Lista
          </button>
        </div>

        <div class="tk-filters">
          @if (filterStatus()) {
            <span class="tk-fchip">
              Estado: {{ stageLabel(filterStatus()!) }}
              <button type="button" (click)="setStatusFilter(null)" aria-label="quitar"><tk-icon name="x" [size]="11" /></button>
            </span>
          }
          @if (overdueOnly()) {
            <span class="tk-fchip">
              Tarea vencida
              <button type="button" (click)="overdueOnly.set(false)" aria-label="quitar"><tk-icon name="x" [size]="11" /></button>
            </span>
          }
          @if (filterStatus() || overdueOnly()) {
            <button type="button" class="tk-clr" (click)="clearFilters()">Limpiar</button>
          } @else {
            <span class="tk-empty-flt">
              <tk-icon name="filter" [size]="12" /> Sin filtros activos
            </span>
          }
        </div>

        <div class="tk-spacer"></div>

        <button type="button" class="btn ghost sm" (click)="overdueOnly.set(!overdueOnly()); reload();">
          <tk-icon name="alert-tri" [size]="12" />Solo vencidas
        </button>
      </div>

      <!-- Body -->
      @if (loading()) {
        <div class="tk-loading">Cargando pipeline…</div>
      }

      @if (view() === 'kanban') {
        <div class="tk-kanban">
          @for (s of stages; track s.id) {
            <div class="tk-col"
                 cdkDropList
                 [id]="'col-' + s.id"
                 [cdkDropListData]="grouped()[s.id]"
                 [cdkDropListConnectedTo]="connectedTo"
                 (cdkDropListDropped)="onDrop($event, s.id)">
              <div class="tk-col-h">
                <span class="dot" [style.background]="dotFor(s.id)"></span>
                <span class="lbl">{{ s.label }}</span>
                <span class="cnt tnum">{{ grouped()[s.id].length }}</span>
              </div>
              <div class="tk-col-body">
                @if (grouped()[s.id].length === 0) {
                  <div class="tk-col-empty">Todavía no marcaste ninguna en este estado.</div>
                }
                @for (e of grouped()[s.id]; track e.id) {
                  <div class="tk-card" cdkDrag (click)="openDrawer(e)">
                    <div class="tk-card-h">
                      <tk-avatar [name]="entryName(e)" [seed]="e.companyRuc" [size]="28" />
                      <div class="tk-card-meta">
                        <div class="tk-card-tt">{{ entryName(e) }}</div>
                        <div class="tk-card-ruc mono">RUC {{ e.companyRuc }}</div>
                      </div>
                    </div>
                    <div class="tk-card-row">
                      <tk-icon name="clock" [size]="11" />
                      <span>{{ e.lastInteractionAt ? 'Último ' + relTime(e.lastInteractionAt) : 'Sin contacto' }}</span>
                      <span class="dotmini"></span>
                      <span>{{ e.daysInStage }}d en estado</span>
                    </div>
                    @if (e.nextTask; as nt) {
                      <div class="tk-card-task" [class.over]="nt.overdue" [class.today]="nt.dueToday">
                        <tk-type-icon [kind]="nt.type" [size]="11" />
                        <span class="d">{{ nt.description }}</span>
                        <span class="m mono">
                          @if (nt.dueToday)      { hoy }
                          @else if (nt.overdue)  { vencida }
                          @else                  { {{ fmtDate(nt.dueAt) }} }
                        </span>
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- LISTA -->
        <div class="tk-list">
          <div class="tk-list-card">
            <div class="tk-list-h">
              <button class="col" style="flex:2.4" (click)="toggleSort('company')">Empresa</button>
              <button class="col" style="flex:0 0 150px" (click)="toggleSort('status')">Estado</button>
              <button class="col" style="flex:0 0 130px" (click)="toggleSort('lastInteractionAt')">Último contacto</button>
              <span class="col" style="flex:2">Próxima acción</span>
              <button class="col right" style="flex:0 0 110px" (click)="toggleSort('daysInStage')">Días estado</button>
              <span style="width:32px"></span>
            </div>
            @if (sorted().length === 0) {
              <div class="tk-list-empty">No hay empresas que coincidan con estos filtros.</div>
            }
            @for (e of sorted(); track e.id) {
              <div class="tk-list-row" (click)="openDrawer(e)">
                <div class="col" style="flex:2.4; display:flex; align-items:center; gap:10px; min-width:0;">
                  <tk-avatar [name]="entryName(e)" [seed]="e.companyRuc" [size]="28" />
                  <div style="min-width:0">
                    <div class="row-tt">{{ entryName(e) }}</div>
                    <div class="row-st"><span class="mono">{{ e.companyRuc }}</span> @if (e.company?.sector) { · {{ e.company?.sector }} }</div>
                  </div>
                </div>
                <div class="col" style="flex:0 0 150px"><tk-stage-pill [stage]="e.status" size="sm" /></div>
                <div class="col" style="flex:0 0 130px; color:var(--t-secondary); font-size:12px;">
                  {{ e.lastInteractionAt ? relTime(e.lastInteractionAt) : '—' }}
                </div>
                <div class="col" style="flex:2; display:flex; align-items:center; gap:6px; min-width:0;">
                  @if (e.nextTask; as nt) {
                    <tk-type-icon [kind]="nt.type" [size]="12" />
                    <span class="row-task">{{ nt.description }}</span>
                    @if (nt.overdue)  { <span class="badge over">vencida</span> }
                    @if (nt.dueToday) { <span class="badge today">hoy</span> }
                  } @else {
                    <span style="color:var(--t-tertiary)">Sin próxima acción</span>
                  }
                </div>
                <div class="col tnum right" style="flex:0 0 110px; color:var(--t-secondary); font-size:12px;">{{ e.daysInStage }}d</div>
                <div style="width:32px; display:flex; justify-content:flex-end;">
                  <tk-icon name="chevron-right" [size]="14" style="color:var(--t-tertiary)" />
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>

    <!-- Drawer + Modales -->
    @if (selectedEntry(); as se) {
      <tk-company-drawer
        [entry]="se"
        (closed)="closeDrawer()"
        (addInteraction)="openInteractionModal()"
        (addTask)="openTaskModal()"
        (statusChanged)="onDrawerStatus($event)"
        (entryUpdated)="onEntryUpdated($event)" />
    }

    @if (showInteractionModal()) {
      <tk-interaction-modal
        [subtitle]="modalSubtitle()"
        [showPromote]="selectedEntry()?.status === 'IN_SIGHT'"
        (closed)="showInteractionModal.set(false)"
        (submitted)="submitInteraction($event)" />
    }

    @if (showTaskModal()) {
      <tk-task-modal
        [initialPipelineEntryId]="selectedEntry()?.id ?? null"
        (closed)="showTaskModal.set(false)"
        (submitted)="submitTask($event)" />
    }

    @if (confirmStage()) {
      <tk-confirm-stage-modal
        [targetStage]="confirmStage()!.target"
        [subtitle]="modalSubtitle()"
        (closed)="confirmStage.set(null)"
        (confirmed)="onConfirmStage($event)" />
    }
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .tk-pipeline { display: flex; flex-direction: column; flex: 1; min-height: 0; }

    .tk-toolbar {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 24px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      flex-shrink: 0; flex-wrap: wrap;
    }
    .tk-viewtoggle {
      display: inline-flex; height: 30px;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
      border-radius: 8px; padding: 2px;
    }
    .tk-viewtoggle button {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 0 10px; height: 26px; border-radius: 6px;
      font-size: 12px; font-weight: 500;
      background: transparent;
      color: var(--t-secondary);
      border: 0; cursor: pointer;
      transition: all var(--dur-base) var(--ease-out);
    }
    .tk-viewtoggle button.is-active {
      background: var(--bg-surface); color: var(--t-primary);
      box-shadow: var(--shadow-xs);
    }

    .tk-filters { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .tk-fchip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 4px 3px 10px; border-radius: 999px;
      background: var(--c-cobalt-50); color: var(--c-cobalt-700);
      font-size: 12px; font-weight: 500;
      border: 1px solid var(--c-cobalt-100);
    }
    .tk-fchip button {
      width: 18px; height: 18px; border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      color: var(--c-cobalt-700); background: transparent; border: 0; cursor: pointer;
    }
    .tk-clr { font-size: 12px; color: var(--t-tertiary); padding: 0 4px; text-decoration: underline; background: transparent; border: 0; cursor: pointer; }
    .tk-empty-flt { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--t-tertiary); }
    .tk-spacer { flex: 1; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 28px; padding: 0 10px; border-radius: 8px;
      font-size: 12px; font-weight: 500;
      border: 1px solid var(--border-default);
      background: var(--bg-surface); color: var(--t-primary);
      cursor: pointer;
    }
    .btn:hover { background: var(--bg-hover); }
    .btn.ghost { border-color: transparent; background: transparent; color: var(--t-secondary); }

    .tk-loading { padding: 16px; text-align: center; font-size: 12px; color: var(--t-tertiary); }

    .tk-kanban {
      display: flex; gap: 12px;
      padding: 16px 24px;
      flex: 1; min-height: 0;
      overflow-x: auto; overflow-y: hidden;
      background: var(--bg-app);
    }
    .tk-col {
      width: 280px; min-width: 280px;
      display: flex; flex-direction: column;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
      border-radius: 12px;
      height: 100%;
      transition: background var(--dur-base) var(--ease-out), border var(--dur-base) var(--ease-out);
    }
    .tk-col.cdk-drop-list-dragging { background: var(--c-cobalt-50); border-color: var(--c-cobalt-300); }
    .tk-col-h {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 14px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .tk-col-h .dot { width: 8px; height: 8px; border-radius: 4px; }
    .tk-col-h .lbl { font-size: 12px; font-weight: 600; color: var(--t-primary); }
    .tk-col-h .cnt {
      font-size: 11px; color: var(--t-tertiary); font-weight: 500;
      padding: 1px 6px; background: var(--bg-surface);
      border-radius: 999px; border: 1px solid var(--border-subtle);
    }
    .tk-col-body {
      flex: 1; min-height: 0; overflow-y: auto;
      padding: 8px; display: flex; flex-direction: column; gap: 6px;
    }
    .tk-col-empty {
      padding: 24px 12px; text-align: center;
      color: var(--t-tertiary); font-size: 12px;
      border: 1px dashed var(--border-default); border-radius: 8px;
      background: var(--bg-surface);
    }
    .tk-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
      padding: 12px 14px;
      cursor: grab;
      transition: border var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
      display: flex; flex-direction: column; gap: 8px;
    }
    .tk-card:hover { border-color: var(--border-strong); box-shadow: var(--shadow-sm); }
    .tk-card.cdk-drag-preview { box-shadow: var(--shadow-lg); cursor: grabbing; }
    .tk-card.cdk-drag-placeholder { opacity: 0.4; }
    .tk-card-h { display: flex; align-items: flex-start; gap: 8px; }
    .tk-card-meta { flex: 1; min-width: 0; }
    .tk-card-tt {
      font-size: 13px; font-weight: 600;
      color: var(--t-primary); line-height: 1.3;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .tk-card-ruc { font-size: 10px; color: var(--t-tertiary); margin-top: 2px; }
    .tk-card-row {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; color: var(--t-tertiary);
    }
    .tk-card-row .dotmini { width: 3px; height: 3px; border-radius: 2px; background: var(--c-ink-300); }
    .tk-card-task {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 500;
      padding: 5px 8px; border-radius: 6px;
      background: var(--bg-sunken); color: var(--t-secondary);
      border: 1px solid var(--border-subtle);
    }
    .tk-card-task .d { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tk-card-task .m { font-size: 10px; font-weight: 500; }
    .tk-card-task.over {
      background: var(--c-risk-high-bg); color: var(--c-risk-high);
      border-color: var(--c-risk-high);
    }
    .tk-card-task.today {
      background: var(--c-cobalt-50); color: var(--c-cobalt-700);
      border-color: var(--c-cobalt-100);
    }

    .tk-list { padding: 16px 24px; height: 100%; overflow: auto; }
    .tk-list-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 12px; overflow: hidden;
    }
    .tk-list-h {
      display: flex; align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-sunken);
      font-size: 11px; font-weight: 500;
      color: var(--t-secondary);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .tk-list-h .col {
      background: transparent; border: 0; cursor: pointer;
      color: inherit; text-align: left; padding: 0;
      font: inherit; letter-spacing: inherit; text-transform: inherit;
    }
    .tk-list-h .col.right { text-align: right; }
    .tk-list-row {
      display: flex; align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      cursor: pointer; font-size: 13px;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .tk-list-row:last-child { border-bottom: 0; }
    .tk-list-row:hover { background: var(--bg-hover); }
    .row-tt { font-weight: 500; color: var(--t-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-st { font-size: 11px; color: var(--t-tertiary); }
    .row-task { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--t-secondary); font-size: 12px; }
    .badge { font-size: 10px; font-weight: 500; padding: 1px 6px; border-radius: 999px; }
    .badge.over { color: var(--c-risk-high); background: var(--c-risk-high-bg); }
    .badge.today { color: var(--c-cobalt-700); background: var(--c-cobalt-50); }
    .right { text-align: right; }
    .tk-list-empty { padding: 48px; text-align: center; color: var(--t-tertiary); font-size: 13px; }
  `],
})
export class PipelinePageComponent {
  private readonly pipelineApi = inject(PipelineApiService);
  private readonly interactionsApi = inject(InteractionsApiService);
  private readonly tasksApi = inject(TasksApiService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly stages = PIPELINE_STAGES;
  readonly fmtDate = fmtDate;
  readonly relTime = relTime;
  readonly view = signal<ViewMode>('kanban');

  readonly entries = signal<PipelineEntry[]>([]);
  readonly loading = signal<boolean>(true);

  /* Filtros */
  readonly filterStatus = signal<PipelineStatus | null>(null);
  readonly overdueOnly = signal<boolean>(false);

  /* Selection / modals */
  readonly selectedEntry = signal<PipelineEntry | null>(null);
  readonly showInteractionModal = signal<boolean>(false);
  readonly showTaskModal = signal<boolean>(false);
  readonly confirmStage = signal<{ target: PipelineStatus } | null>(null);

  readonly modalSubtitle = computed(() => {
    const e = this.selectedEntry();
    return e ? this.entryName(e) : undefined;
  });

  readonly grouped = computed(() => {
    const map: Record<PipelineStatus, PipelineEntry[]> = {
      IN_SIGHT: [], CONTACTED: [], IN_CONVERSATION: [], PROPOSAL: [], WON: [], LOST: [],
    };
    for (const e of this.entries()) (map[e.status] ??= []).push(e);
    return map;
  });

  readonly connectedTo = ['col-IN_SIGHT', 'col-CONTACTED', 'col-IN_CONVERSATION', 'col-PROPOSAL', 'col-WON', 'col-LOST'];

  /* List sort */
  readonly sortKey = signal<string>('daysInStage');
  readonly sortDir = signal<'asc' | 'desc'>('desc');

  readonly sorted = computed<PipelineEntry[]>(() => {
    const arr = this.entries().slice();
    const key = this.sortKey();
    const dir = this.sortDir();
    arr.sort((a, b) => {
      let av: unknown = (a as any)[key];
      let bv: unknown = (b as any)[key];
      if (key === 'company') { av = this.entryName(a); bv = this.entryName(b); }
      if (key === 'status')  { av = PIPELINE_STAGES.findIndex(s => s.id === a.status); bv = PIPELINE_STAGES.findIndex(s => s.id === b.status); }
      if (key === 'lastInteractionAt') { av = a.lastInteractionAt ?? ''; bv = b.lastInteractionAt ?? ''; }
      const cmp = (av as any) < (bv as any) ? -1 : (av as any) > (bv as any) ? 1 : 0;
      return dir === 'asc' ? cmp : -cmp;
    });
    return arr;
  });

  /* Reactive query params */
  private readonly params = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });

  constructor() {
    /* Aplicar query params iniciales */
    const p = this.route.snapshot.queryParamMap;
    const status = p.get('status') as PipelineStatus | null;
    if (status && PIPELINE_STAGES.some(s => s.id === status)) {
      this.filterStatus.set(status);
    }
    const entryId = p.get('entryId');
    this.reload(entryId ?? undefined);
  }

  reload(autoOpenId?: string): void {
    this.loading.set(true);
    this.pipelineApi.list({
      status: this.filterStatus() ?? undefined,
      withOverdueTask: this.overdueOnly() ? true : undefined,
    })
      .pipe(catchError((err) => {
        this.toast.error('No pudimos cargar el pipeline');
        console.error(err);
        return of([] as PipelineEntry[]);
      }))
      .subscribe((xs) => {
        this.entries.set(xs);
        this.loading.set(false);
        if (autoOpenId) {
          const found = xs.find(e => e.id === autoOpenId);
          if (found) this.selectedEntry.set(found);
        }
      });
  }

  setStatusFilter(v: PipelineStatus | null): void {
    this.filterStatus.set(v);
    this.reload();
  }

  clearFilters(): void {
    this.filterStatus.set(null);
    this.overdueOnly.set(false);
    this.reload();
  }

  toggleSort(key: string): void {
    if (this.sortKey() === key) {
      this.sortDir.set(this.sortDir() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortKey.set(key);
      this.sortDir.set('desc');
    }
  }

  entryName(e: PipelineEntry): string {
    return e.companyName ?? e.company?.razonSocial ?? e.companyRuc;
  }

  stageLabel(s: PipelineStatus): string {
    return STAGE_BY_ID[s]?.label ?? s;
  }

  dotFor(s: PipelineStatus): string {
    return STAGE_STYLES[s]?.dot ?? 'var(--c-ink-400)';
  }

  /* DnD */
  onDrop(event: CdkDragDrop<PipelineEntry[]>, target: PipelineStatus): void {
    if (event.previousContainer === event.container) return;
    const item = event.previousContainer.data[event.previousIndex];
    if (!item) return;
    if (item.status === target) return;
    if (target === 'WON' || target === 'LOST') {
      this.selectedEntry.set(item);
      this.confirmStage.set({ target });
      return;
    }
    this.applyStatusChange(item, target);
  }

  applyStatusChange(entry: PipelineEntry, status: PipelineStatus, lostReason?: string): void {
    /* Optimistic */
    const prev = entry.status;
    this.entries.update(xs => xs.map(e => e.id === entry.id ? { ...e, status, daysInStage: 0, lostReason: lostReason ?? e.lostReason } : e));
    this.pipelineApi.changeStatus(entry.id, { status, lostReason }).subscribe({
      next: (updated) => {
        this.entries.update(xs => xs.map(e => e.id === updated.id ? updated : e));
        if (this.selectedEntry()?.id === entry.id) this.selectedEntry.set(updated);
        this.toast.success(`Movida a ${this.stageLabel(status)}`);
      },
      error: () => {
        /* rollback */
        this.entries.update(xs => xs.map(e => e.id === entry.id ? { ...e, status: prev } : e));
        this.toast.error('No se pudo cambiar el estado');
      },
    });
  }

  openDrawer(e: PipelineEntry): void {
    this.selectedEntry.set(e);
    this.router.navigate([], { queryParams: { entryId: e.id }, queryParamsHandling: 'merge' });
  }

  closeDrawer(): void {
    this.selectedEntry.set(null);
    this.router.navigate([], { queryParams: { entryId: null }, queryParamsHandling: 'merge' });
  }

  onDrawerStatus(payload: { status: PipelineStatus; lostReason?: string }): void {
    const e = this.selectedEntry();
    if (!e) return;
    if ((payload.status === 'WON' || payload.status === 'LOST') && payload.status !== e.status) {
      this.confirmStage.set({ target: payload.status });
      return;
    }
    this.applyStatusChange(e, payload.status, payload.lostReason);
  }

  onConfirmStage(p: { status: PipelineStatus; lostReason?: string }): void {
    const e = this.selectedEntry();
    this.confirmStage.set(null);
    if (!e) return;
    this.applyStatusChange(e, p.status, p.lostReason);
  }

  onEntryUpdated(updated: PipelineEntry): void {
    this.entries.update(xs => xs.map(e => e.id === updated.id ? updated : e));
    this.selectedEntry.set(updated);
  }

  /* Modal triggers */
  openInteractionModal(): void { if (this.selectedEntry()) this.showInteractionModal.set(true); }
  openTaskModal(): void        { if (this.selectedEntry()) this.showTaskModal.set(true); }

  submitInteraction(payload: any): void {
    const e = this.selectedEntry();
    if (!e) return;
    this.interactionsApi.create(e.id, payload).subscribe({
      next: () => {
        this.showInteractionModal.set(false);
        this.toast.success('Interacción registrada');
        if (payload.promoteToContacted && e.status === 'IN_SIGHT') {
          this.applyStatusChange(e, 'CONTACTED');
        }
        this.reload(e.id);
      },
      error: () => this.toast.error('No se pudo registrar la interacción'),
    });
  }

  submitTask(payload: { description: string; dueAt: string; type: TaskItem['type'] }): void {
    const e = this.selectedEntry();
    if (!e) return;
    this.tasksApi.create({ ...payload, pipelineEntryId: e.id }).subscribe({
      next: () => {
        this.showTaskModal.set(false);
        this.toast.success('Próxima acción creada');
        this.reload(e.id);
      },
      error: () => this.toast.error('No se pudo crear la tarea'),
    });
  }
}
