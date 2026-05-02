import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, computed, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { TypeIconComponent } from '../../../../shared/components/type-icon/type-icon.component';
import { StagePillComponent } from '../../../../shared/components/stage-pill/stage-pill.component';
import {
  Contact, Interaction, Note, PIPELINE_STAGES, PipelineEntry, PipelineStatus, TaskItem,
} from '../../../../core/api/types';
import { InteractionsApiService } from '../../../../core/api/interactions-api.service';
import { TasksApiService } from '../../../../core/api/tasks-api.service';
import { NotesApiService } from '../../../../core/api/notes-api.service';
import { ContactsApiService } from '../../../../core/api/contacts-api.service';
import { PipelineApiService } from '../../../../core/api/pipeline-api.service';
import { fmtDate, fmtDateLong, relTime } from '../../../../shared/utils/date-helpers';
import { ToastService } from '../../../../shared/services/toast.service';

@Component({
  selector: 'tk-company-drawer',
  standalone: true,
  imports: [IconComponent, AvatarComponent, TypeIconComponent, StagePillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tk-backdrop" (click)="closed.emit()"></div>
    <aside class="tk-drawer">
      <!-- Header -->
      <header class="tk-h">
        <div class="tk-h-row">
          <tk-avatar [name]="company().name" [seed]="company().seed" [size]="48" />
          <div class="tk-h-meta">
            <h2>{{ company().name }}</h2>
            <div class="tk-h-sub">
              <span class="mono">{{ company().ruc }}</span>
              @if (company().sector) { <span class="dot"></span><span>{{ company().sector }}</span> }
              @if (company().city)   { <span class="dot"></span><span>{{ company().city }}</span> }
            </div>
          </div>
          <button class="tk-h-close" (click)="closed.emit()" type="button" aria-label="Cerrar">
            <tk-icon name="x" [size]="16" />
          </button>
        </div>
      </header>

      <!-- Body -->
      <div class="tk-body">
        <!-- Banda estado -->
        <div class="tk-stage-band">
          <span class="tk-tip">Estado</span>
          <div class="tk-stage-wrap">
            <button class="tk-stage-btn" (click)="stageMenuOpen.set(!stageMenuOpen())" type="button">
              <tk-stage-pill [stage]="entry().status" size="lg" />
              <tk-icon name="chevron-down" [size]="14" style="color:var(--t-tertiary)" />
            </button>
            @if (stageMenuOpen()) {
              <div class="tk-stage-menu">
                @for (s of stages; track s.id) {
                  <button type="button" class="tk-stage-opt"
                          [class.is-active]="entry().status === s.id"
                          (click)="changeStatus(s.id); stageMenuOpen.set(false);">
                    <tk-stage-pill [stage]="s.id" size="sm" />
                    <span>{{ s.description }}</span>
                  </button>
                }
              </div>
            }
          </div>
          <div class="tk-spacer"></div>
          <span class="tk-aged">{{ entry().daysInStage }}d en este estado</span>
        </div>

        @if (entry().status === 'LOST' && entry().lostReason) {
          <div class="tk-lost">
            <div class="tk-lost-h">¿Por qué la perdimos?</div>
            <div class="tk-lost-b">{{ entry().lostReason }}</div>
          </div>
        }

        <!-- Hipótesis valor -->
        <section class="tk-section">
          <div class="tk-sec-h">
            <tk-icon name="spark" [size]="14" style="color:var(--c-cobalt-500)" />
            <h3>Hipótesis de valor</h3>
            <span class="tk-sec-sub">¿Por qué esta empresa? ¿Qué le ofrecemos?</span>
          </div>
          @if (editingHipotesis()) {
            <textarea class="tk-ta" [value]="hipotesis()" (input)="hipotesis.set($any($event.target).value)"
                      (blur)="saveHipotesis()" autofocus></textarea>
          } @else {
            <button class="tk-hipotesis" (click)="editingHipotesis.set(true)" type="button"
                    [class.is-empty]="!hipotesis()">
              {{ hipotesis() || 'Hacé click para escribir tu hipótesis…' }}
            </button>
          }
        </section>

        <!-- Próxima acción -->
        <section class="tk-section">
          <div class="tk-sec-h">
            <tk-icon name="calendar" [size]="14" style="color:var(--c-cobalt-500)" />
            <h3>Próxima acción</h3>
            <div class="tk-spacer"></div>
            <button class="btn ghost sm" (click)="addTask.emit()" type="button">
              <tk-icon name="plus" [size]="12" />Agregar
            </button>
          </div>
          @if (nextTask(); as nt) {
            <div class="tk-next" [class.is-overdue]="nt.overdue">
              <tk-type-icon [kind]="nt.type" [size]="18" />
              <div class="tk-next-body">
                <div class="tk-next-tt">{{ nt.description }}</div>
                <div class="tk-next-st">
                  {{ fmtDateLong(nt.dueAt) }}
                  @if (nt.overdue)   { <span class="tag-over">· vencida</span> }
                  @if (nt.dueToday)  { <span class="tag-today">· hoy</span> }
                </div>
              </div>
              <button class="btn primary sm" (click)="completeTask(nt)" type="button">
                <tk-icon name="check" [size]="12" />Completar
              </button>
            </div>
          } @else {
            <div class="tk-empty">No hay próxima acción definida.</div>
          }
        </section>

        <!-- Interacciones -->
        <section class="tk-section">
          <div class="tk-sec-h">
            <tk-icon name="message" [size]="14" style="color:var(--c-cobalt-500)" />
            <h3>Interacciones</h3>
            <span class="tk-sec-sub">· {{ interactions().length }} registradas</span>
            <div class="tk-spacer"></div>
            <button class="btn cobalt sm" (click)="addInteraction.emit()" type="button">
              <tk-icon name="plus" [size]="12" />Registrar
            </button>
          </div>
          @if (interactions().length === 0) {
            <div class="tk-empty">Todavía no hay interacciones registradas.</div>
          } @else {
            <div class="tk-timeline">
              <div class="tk-spine"></div>
              @for (i of interactions(); track i.id) {
                <div class="tk-it">
                  <div class="tk-it-mark"><tk-type-icon [kind]="i.type" [size]="14" /></div>
                  <div class="tk-it-body">
                    <div class="tk-it-tt">{{ i.summary }}</div>
                    <div class="tk-it-st">
                      {{ i.authorUsername ?? '—' }} · {{ relTime(i.occurredAt) }} ·
                      <span class="mono">{{ fmtDate(i.occurredAt) }}</span>
                    </div>
                    @if (i.detail) {
                      <div class="tk-it-dt">{{ i.detail }}</div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Notas -->
        <section class="tk-section">
          <div class="tk-sec-h">
            <tk-icon name="note" [size]="14" style="color:var(--c-cobalt-500)" />
            <h3>Notas</h3>
            <span class="tk-sec-sub">· {{ notes().length }} notas</span>
            <div class="tk-spacer"></div>
            <button class="btn ghost sm" (click)="addingNote.set(!addingNote())" type="button">
              <tk-icon name="plus" [size]="12" />Agregar
            </button>
          </div>
          @if (addingNote()) {
            <div class="tk-note-form">
              <textarea class="tk-ta" placeholder="Escribí una nota…" [value]="newNote()"
                        (input)="newNote.set($any($event.target).value)"></textarea>
              <div class="tk-note-actions">
                <button class="btn ghost sm" type="button" (click)="addingNote.set(false); newNote.set('');">Cancelar</button>
                <button class="btn primary sm" type="button"
                        [disabled]="!newNote().trim()" (click)="saveNote()">Guardar</button>
              </div>
            </div>
          }
          @if (notes().length === 0 && !addingNote()) {
            <div class="tk-empty">Sin notas.</div>
          } @else {
            <div class="tk-notes">
              @for (n of notes(); track n.id) {
                <div class="tk-note">
                  <div class="tk-note-b">{{ n.body }}</div>
                  <div class="tk-note-m">{{ n.authorUsername ?? '—' }} · {{ relTime(n.createdAt) }}</div>
                </div>
              }
            </div>
          }
        </section>

        <!-- Contactos -->
        <section class="tk-section">
          <div class="tk-sec-h">
            <tk-icon name="users" [size]="14" style="color:var(--c-cobalt-500)" />
            <h3>Contactos</h3>
            <span class="tk-sec-sub">· {{ contacts().length }} personas</span>
            <div class="tk-spacer"></div>
            <button class="btn ghost sm" (click)="addingContact.set(!addingContact())" type="button">
              <tk-icon name="plus" [size]="12" />Agregar
            </button>
          </div>
          @if (addingContact()) {
            <div class="tk-contact-form">
              <input class="tk-in" placeholder="Nombre completo *" [value]="newContactName()"
                     (input)="newContactName.set($any($event.target).value)" />
              <input class="tk-in" placeholder="Cargo / rol" [value]="newContactRole()"
                     (input)="newContactRole.set($any($event.target).value)" />
              <div class="tk-contact-row">
                <input class="tk-in" placeholder="Email" type="email" [value]="newContactEmail()"
                       (input)="newContactEmail.set($any($event.target).value)" />
                <input class="tk-in" placeholder="Teléfono" [value]="newContactPhone()"
                       (input)="newContactPhone.set($any($event.target).value)" />
              </div>
              <div class="tk-note-actions">
                <button class="btn ghost sm" type="button"
                        (click)="cancelAddContact()">Cancelar</button>
                <button class="btn primary sm" type="button"
                        [disabled]="!newContactName().trim()"
                        (click)="saveContact()">Guardar</button>
              </div>
            </div>
          }
          @if (contacts().length === 0 && !addingContact()) {
            <div class="tk-empty">Sin contactos cargados todavía.</div>
          } @else if (contacts().length > 0) {
            <div class="tk-contacts">
              @for (c of contacts(); track c.id) {
                <div class="tk-contact">
                  <div class="tk-contact-a">{{ contactInitials(c.name) }}</div>
                  <div class="tk-contact-body">
                    <div class="tk-contact-n">{{ c.name }}</div>
                    @if (c.role) { <div class="tk-contact-r">{{ c.role }}</div> }
                  </div>
                  @if (c.email) {
                    <a class="ic-link" [href]="'mailto:' + c.email" [title]="c.email">
                      <tk-icon name="mail" [size]="14" />
                    </a>
                  }
                  @if (c.phone) {
                    <a class="ic-link" [href]="'tel:' + c.phone" [title]="c.phone">
                      <tk-icon name="phone" [size]="14" />
                    </a>
                  }
                  @if (c.linkedinUrl) {
                    <a class="ic-link" [href]="c.linkedinUrl" target="_blank" rel="noopener" title="LinkedIn">
                      <tk-icon name="linkedin" [size]="14" />
                    </a>
                  }
                </div>
              }
            </div>
          }
        </section>

        <div style="height:32px"></div>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: contents; }
    .tk-backdrop {
      position: fixed; inset: 0;
      background: var(--bg-overlay);
      z-index: var(--z-drawer);
      animation: fade-in var(--dur-base) var(--ease-out);
    }
    .tk-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: 560px; max-width: 92vw;
      background: var(--bg-surface);
      border-left: 1px solid var(--border-default);
      box-shadow: var(--shadow-xl);
      z-index: var(--z-drawer);
      display: flex; flex-direction: column;
      animation: slide-in-right var(--dur-slow) var(--ease-out);
    }
    .tk-h { padding: 20px 24px 16px; border-bottom: 1px solid var(--border-subtle); flex-shrink: 0; }
    .tk-h-row { display: flex; align-items: flex-start; gap: 14px; }
    .tk-h-meta { flex: 1; min-width: 0; }
    .tk-h-meta h2 {
      margin: 0; font-family: var(--font-display);
      font-size: 20px; font-weight: 600; color: var(--t-primary);
      letter-spacing: -0.01em; line-height: 1.25;
    }
    .tk-h-sub {
      display: flex; align-items: center; gap: 8px; margin-top: 4px;
      font-size: 12px; color: var(--t-tertiary);
    }
    .tk-h-sub .dot { width: 3px; height: 3px; border-radius: 2px; background: var(--c-ink-300); }
    .tk-h-close {
      width: 32px; height: 32px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: var(--t-secondary);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      cursor: pointer;
    }
    .tk-h-close:hover { background: var(--bg-hover); color: var(--t-primary); }

    .tk-body { flex: 1; min-height: 0; overflow-y: auto; }

    .tk-stage-band {
      padding: 16px 24px; background: var(--bg-sunken);
      border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: center; gap: 12px;
    }
    .tk-tip {
      font-size: 11px; color: var(--t-tertiary);
      text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500;
    }
    .tk-stage-wrap { position: relative; }
    .tk-stage-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent; border: 0; cursor: pointer;
    }
    .tk-stage-menu {
      position: absolute; top: calc(100% + 4px); left: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 10px; box-shadow: var(--shadow-lg);
      padding: 4px; min-width: 240px; z-index: 10;
    }
    .tk-stage-opt {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 8px 10px; border-radius: 6px; text-align: left;
      background: transparent; border: 0; cursor: pointer;
    }
    .tk-stage-opt:hover, .tk-stage-opt.is-active { background: var(--bg-hover); }
    .tk-stage-opt span { font-size: 12px; color: var(--t-secondary); }
    .tk-spacer { flex: 1; }
    .tk-aged { font-size: 12px; color: var(--t-tertiary); }

    .tk-lost {
      margin: 16px 24px 0;
      padding: 12px 14px;
      background: var(--c-risk-high-bg);
      border: 1px solid var(--border-subtle);
      border-radius: 10px;
    }
    .tk-lost-h {
      font-size: 11px; font-weight: 600; color: var(--c-risk-high);
      text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px;
    }
    .tk-lost-b { font-size: 13px; color: var(--t-primary); }

    .tk-section { padding: 20px 24px; border-bottom: 1px solid var(--border-subtle); }
    .tk-sec-h { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .tk-sec-h h3 { margin: 0; font-size: 13px; font-weight: 600; color: var(--t-primary); }
    .tk-sec-sub { font-size: 11px; color: var(--t-tertiary); }

    .tk-hipotesis {
      width: 100%; text-align: left;
      padding: 10px 12px; border-radius: 8px;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
      font-size: 13px; color: var(--t-primary);
      line-height: 1.5; cursor: pointer;
    }
    .tk-hipotesis.is-empty {
      background: transparent;
      border: 1px dashed var(--border-default);
      color: var(--t-tertiary);
      font-style: italic;
    }
    .tk-ta {
      width: 100%; min-height: 80px; resize: vertical;
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid var(--c-cobalt-300);
      background: var(--bg-surface); color: var(--t-primary);
      font-family: var(--font-ui); font-size: 13px; line-height: 1.5;
      outline: 0; box-shadow: var(--shadow-focus);
    }

    .tk-empty {
      padding: 14px 12px; text-align: center;
      background: var(--bg-sunken);
      border: 1px dashed var(--border-default);
      border-radius: 8px;
      font-size: 12px; color: var(--t-tertiary);
    }

    .tk-next {
      padding: 12px 14px;
      background: var(--bg-surface);
      border: 1px solid var(--c-cobalt-200);
      border-left: 3px solid var(--c-cobalt-500);
      border-radius: 10px;
      display: flex; align-items: center; gap: 12px;
    }
    .tk-next.is-overdue {
      background: var(--c-risk-high-bg);
      border-color: var(--c-risk-high);
      border-left-color: var(--c-risk-high);
    }
    .tk-next-body { flex: 1; min-width: 0; }
    .tk-next-tt { font-size: 13px; font-weight: 500; color: var(--t-primary); margin-bottom: 2px; }
    .tk-next-st { font-size: 11px; color: var(--t-tertiary); }
    .tag-over { color: var(--c-risk-high); font-weight: 500; }
    .tag-today { color: var(--c-cobalt-700); font-weight: 500; }

    .tk-timeline { display: flex; flex-direction: column; position: relative; }
    .tk-spine { position: absolute; left: 19px; top: 16px; bottom: 16px; width: 1px; background: var(--border-subtle); }
    .tk-it { display: flex; gap: 12px; padding: 10px 0; position: relative; }
    .tk-it-mark {
      width: 32px; height: 32px; border-radius: 16px;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; z-index: 1;
    }
    .tk-it-body { flex: 1; min-width: 0; }
    .tk-it-tt { font-size: 13px; font-weight: 500; color: var(--t-primary); margin-bottom: 2px; }
    .tk-it-st { font-size: 11px; color: var(--t-tertiary); }
    .tk-it-dt {
      margin-top: 8px; padding: 10px 12px;
      background: var(--bg-sunken); border-radius: 8px;
      font-size: 12px; color: var(--t-secondary); line-height: 1.55;
    }

    .tk-note-form { display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px; }
    .tk-note-form .tk-ta { box-shadow: none; border-color: var(--border-default); }
    .tk-note-actions { display: flex; gap: 6px; justify-content: flex-end; }

    .tk-contact-form {
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 12px;
      padding: 12px;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
    }
    .tk-contact-row { display: flex; gap: 8px; }
    .tk-contact-row .tk-in { flex: 1; }
    .tk-in {
      width: 100%; height: 32px;
      padding: 0 10px; border-radius: 6px;
      border: 1px solid var(--border-default);
      background: var(--bg-surface);
      font-family: var(--font-ui); font-size: 13px;
      color: var(--t-primary); outline: 0;
    }
    .tk-in:focus { border-color: var(--c-cobalt-300); box-shadow: var(--shadow-focus); }
    .tk-notes { display: flex; flex-direction: column; gap: 8px; }
    .tk-note {
      padding: 10px 12px; border-radius: 8px;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
    }
    .tk-note-b { font-size: 13px; color: var(--t-primary); line-height: 1.5; margin-bottom: 6px; }
    .tk-note-m { font-size: 11px; color: var(--t-tertiary); }

    .tk-contacts { display: flex; flex-direction: column; gap: 6px; }
    .tk-contact {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
    }
    .tk-contact-a {
      width: 32px; height: 32px; border-radius: 16px;
      background: var(--bg-pill);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 600; color: var(--t-secondary);
    }
    .tk-contact-body { flex: 1; min-width: 0; }
    .tk-contact-n { font-size: 13px; font-weight: 500; color: var(--t-primary); }
    .tk-contact-r { font-size: 11px; color: var(--t-tertiary); }
    .ic-link {
      width: 28px; height: 28px; border-radius: 6px;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--t-secondary);
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      text-decoration: none;
    }
    .ic-link:hover { background: var(--bg-hover); color: var(--t-primary); }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 12px; border-radius: 8px;
      font-size: 12px; font-weight: 500;
      border: 1px solid var(--border-default);
      background: var(--bg-surface); color: var(--t-primary);
      cursor: pointer;
    }
    .btn:hover { background: var(--bg-hover); }
    .btn.sm { height: 28px; padding: 0 10px; font-size: 12px; }
    .btn.ghost { border-color: transparent; background: transparent; color: var(--t-secondary); }
    .btn.cobalt { background: var(--c-cobalt-50); color: var(--c-cobalt-700); border-color: var(--c-cobalt-100); }
    .btn.cobalt:hover { background: var(--c-cobalt-100); }
    .btn.primary { background: var(--c-cobalt-500); color: #fff; border-color: var(--c-cobalt-500); }
    .btn.primary:hover { background: var(--c-cobalt-600); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class CompanyDrawerComponent implements OnChanges {
  @Input({ required: true, alias: 'entry' }) set entryIn(v: PipelineEntry) { this._entry.set(v); }
  @Output() closed = new EventEmitter<void>();
  @Output() addInteraction = new EventEmitter<void>();
  @Output() addTask = new EventEmitter<void>();
  @Output() statusChanged = new EventEmitter<{ status: PipelineStatus; lostReason?: string }>();
  @Output() entryUpdated = new EventEmitter<PipelineEntry>();

  private readonly interactionsApi = inject(InteractionsApiService);
  private readonly tasksApi = inject(TasksApiService);
  private readonly notesApi = inject(NotesApiService);
  private readonly contactsApi = inject(ContactsApiService);
  private readonly pipelineApi = inject(PipelineApiService);
  private readonly toast = inject(ToastService);

  private readonly _entry = signal<PipelineEntry>(null as unknown as PipelineEntry);
  readonly entry = computed(() => this._entry());

  readonly stages = PIPELINE_STAGES;
  readonly stageMenuOpen = signal<boolean>(false);
  readonly editingHipotesis = signal<boolean>(false);
  readonly hipotesis = signal<string>('');
  readonly addingNote = signal<boolean>(false);
  readonly newNote = signal<string>('');

  readonly addingContact = signal<boolean>(false);
  readonly newContactName = signal<string>('');
  readonly newContactRole = signal<string>('');
  readonly newContactEmail = signal<string>('');
  readonly newContactPhone = signal<string>('');

  readonly interactions = signal<Interaction[]>([]);
  readonly tasks = signal<TaskItem[]>([]);
  readonly notes = signal<Note[]>([]);
  readonly contacts = signal<Contact[]>([]);

  readonly nextTask = computed<TaskItem | null>(() => {
    const open = this.tasks().filter(t => !t.completed);
    if (open.length === 0) return null;
    return open.slice().sort((a, b) => +new Date(a.dueAt) - +new Date(b.dueAt))[0]!;
  });

  readonly company = computed(() => {
    const e = this._entry();
    if (!e) return { name: '—', ruc: '—', sector: null as string | null, city: null as string | null, seed: '' };
    return {
      name: e.companyName ?? e.company?.razonSocial ?? e.companyRuc,
      ruc: e.companyRuc,
      sector: e.company?.sector ?? null,
      city: e.company?.ciudad ?? null,
      seed: e.companyRuc,
    };
  });

  /* helpers expuestos al template */
  readonly fmtDate = fmtDate;
  readonly fmtDateLong = fmtDateLong;
  readonly relTime = relTime;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['entryIn']) {
      const e = this._entry();
      if (!e) return;
      this.hipotesis.set(e.valueHypothesis ?? '');
      this.editingHipotesis.set(false);
      this.stageMenuOpen.set(false);
      this.loadDetail(e.id);
    }
  }

  private loadDetail(entryId: string): void {
    forkJoin({
      interactions: this.interactionsApi.list(entryId).pipe(catchError(() => of([] as Interaction[]))),
      tasks:        this.tasksApi.byEntry(entryId).pipe(catchError(() => of([] as TaskItem[]))),
      notes:        this.notesApi.list(entryId).pipe(catchError(() => of([] as Note[]))),
      contacts:     this.contactsApi.list(entryId).pipe(catchError(() => of([] as Contact[]))),
    }).subscribe(({ interactions, tasks, notes, contacts }) => {
      this.interactions.set(interactions.slice().sort((a, b) => +new Date(b.occurredAt) - +new Date(a.occurredAt)));
      this.tasks.set(tasks);
      this.notes.set(notes.slice().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      this.contacts.set(contacts);
    });
  }

  contactInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(s => s[0]).slice(0, 2).join('').toUpperCase();
  }

  saveHipotesis(): void {
    const text = this.hipotesis().trim();
    const e = this.entry();
    if (text === (e.valueHypothesis ?? '')) {
      this.editingHipotesis.set(false);
      return;
    }
    this.pipelineApi.updateValueHypothesis(e.id, text).subscribe({
      next: (updated) => {
        this.editingHipotesis.set(false);
        this.entryUpdated.emit(updated);
        this.toast.success('Hipótesis guardada');
      },
      error: () => this.toast.error('No se pudo guardar la hipótesis'),
    });
  }

  changeStatus(status: PipelineStatus): void {
    if (status === this.entry().status) return;
    this.statusChanged.emit({ status });
  }

  completeTask(t: TaskItem): void {
    this.tasksApi.complete(t.id).subscribe({
      next: () => {
        this.tasks.update(xs => xs.map(x => x.id === t.id ? { ...x, completed: true } : x));
        this.toast.success('Tarea completada');
        /* Refresca el entry desde la API para que la card del kanban refleje
         * que ya no hay próxima acción (el DTO trae nextTask derivado). */
        this.pipelineApi.get(this.entry().id).subscribe({
          next: (updated) => this.entryUpdated.emit(updated),
          error: () => { /* no toast: el complete ya se hizo OK */ },
        });
      },
      error: () => this.toast.error('No se pudo completar'),
    });
  }

  saveNote(): void {
    const body = this.newNote().trim();
    if (!body) return;
    this.notesApi.create(this.entry().id, body).subscribe({
      next: (n) => {
        this.notes.update(xs => [n, ...xs]);
        this.newNote.set('');
        this.addingNote.set(false);
        this.toast.success('Nota guardada');
      },
      error: () => this.toast.error('No se pudo guardar la nota'),
    });
  }

  cancelAddContact(): void {
    this.addingContact.set(false);
    this.newContactName.set('');
    this.newContactRole.set('');
    this.newContactEmail.set('');
    this.newContactPhone.set('');
  }

  saveContact(): void {
    const name = this.newContactName().trim();
    if (!name) return;
    const payload = {
      name,
      role: this.newContactRole().trim() || undefined,
      email: this.newContactEmail().trim() || undefined,
      phone: this.newContactPhone().trim() || undefined,
    };
    this.contactsApi.create(this.entry().id, payload).subscribe({
      next: (c) => {
        this.contacts.update(xs => [...xs, c]);
        this.cancelAddContact();
        this.toast.success('Contacto agregado');
      },
      error: () => this.toast.error('No se pudo agregar el contacto'),
    });
  }
}
