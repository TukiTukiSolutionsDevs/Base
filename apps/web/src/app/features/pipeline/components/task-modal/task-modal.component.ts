import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { TaskType } from '../../../../core/api/types';

export interface TaskModalPayload {
  description: string;
  dueAt: string;
  type: TaskType;
}

@Component({
  selector: 'tk-task-modal',
  standalone: true,
  imports: [FormsModule, IconComponent, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tk-modal-shell title="Nueva próxima acción"
                    subtitle="Definí el siguiente paso concreto"
                    [width]="460"
                    (closed)="closed.emit()">
      <label class="fld">
        <span class="lbl">Descripción <span class="req">*</span></span>
        <input class="inp" autofocus
               placeholder="Llamar a María, mandar propuesta v2…"
               [value]="desc()" (input)="desc.set($any($event.target).value)" />
      </label>

      <div class="row-2">
        <label class="fld">
          <span class="lbl">Fecha objetivo <span class="req">*</span></span>
          <input type="date" class="inp" [value]="date()" (input)="setDate($any($event.target).value)" />
        </label>
        <label class="fld">
          <span class="lbl">Hora</span>
          <input type="time" class="inp" [value]="time()" (input)="time.set($any($event.target).value)" />
        </label>
      </div>

      <label class="fld">
        <span class="lbl">Tipo</span>
        <div class="chips">
          @for (o of typeOptions; track o.value) {
            <button type="button" class="chip"
                    [class.is-active]="type() === o.value"
                    (click)="type.set(o.value)">
              <tk-icon [name]="o.icon" [size]="12" />{{ o.label }}
            </button>
          }
        </div>
      </label>

      <div footer>
        <button type="button" class="btn ghost" (click)="closed.emit()">Cancelar</button>
        <button type="button" class="btn primary"
                [disabled]="!desc().trim() || !date()" (click)="onSubmit()">
          <tk-icon name="check" [size]="14" />Crear acción
        </button>
      </div>
    </tk-modal-shell>
  `,
  styles: [`
    .fld { display: flex; flex-direction: column; gap: 6px; }
    .lbl {
      font-size: 11px; font-weight: 500; color: var(--t-secondary);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .req { color: var(--c-risk-high); margin-left: 3px; }
    .inp {
      padding: 0 12px; height: 34px;
      border: 1px solid var(--border-default);
      border-radius: 8px; background: var(--bg-surface);
      color: var(--t-primary); font-size: 13px; outline: 0;
    }
    .row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 999px;
      background: var(--bg-surface); color: var(--t-secondary);
      border: 1px solid var(--border-default);
      font-size: 12px; font-weight: 500; cursor: pointer;
    }
    .chip.is-active {
      background: var(--c-cobalt-50); color: var(--c-cobalt-700);
      border-color: var(--c-cobalt-300);
    }
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 14px; border-radius: 8px;
      font-size: 13px; font-weight: 500;
      border: 1px solid var(--border-default);
      background: var(--bg-surface); color: var(--t-primary);
      cursor: pointer;
    }
    .btn:hover { background: var(--bg-hover); }
    .btn.ghost { border-color: transparent; background: transparent; color: var(--t-secondary); }
    .btn.primary { background: var(--c-cobalt-500); color: #fff; border-color: var(--c-cobalt-500); }
    .btn.primary:hover { background: var(--c-cobalt-600); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class TaskModalComponent {
  @Input() initialPipelineEntryId: string | null = null;
  /** Si es true, la fecha default es HOY (acción rápida del topbar).
   *  Por defecto false → +7 días (planificación futura desde el drawer del pipeline). */
  @Input() set quickAction(v: boolean) {
    if (v && !this.dateTouched) this.date.set(this.todayString());
  }
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<TaskModalPayload>();

  readonly typeOptions: Array<{ value: TaskType; label: string; icon: string }> = [
    { value: 'CALL',     label: 'Llamada',    icon: 'phone' },
    { value: 'EMAIL',    label: 'Email',      icon: 'mail' },
    { value: 'MEETING',  label: 'Reunión',    icon: 'handshake' },
    { value: 'RESEARCH', label: 'Investigar', icon: 'search-sparkle' },
    { value: 'OTHER',    label: 'Otro',       icon: 'message' },
  ];

  readonly desc = signal<string>('');
  readonly date = signal<string>(this.defaultDate());
  readonly time = signal<string>('09:00');
  readonly type = signal<TaskType>('CALL');

  /** Track si el usuario ya tocó la fecha — para no pisarla con el quickAction setter. */
  private dateTouched = false;

  setDate(v: string): void {
    this.dateTouched = true;
    this.date.set(v);
  }

  private defaultDate(): string {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return this.formatDate(d);
  }

  private todayString(): string {
    return this.formatDate(new Date());
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  onSubmit(): void {
    const description = this.desc().trim();
    if (!description || !this.date()) return;
    const t = this.time() || '09:00';
    const dueAt = new Date(`${this.date()}T${t}:00`).toISOString();
    this.submitted.emit({ description, dueAt, type: this.type() });
  }
}
