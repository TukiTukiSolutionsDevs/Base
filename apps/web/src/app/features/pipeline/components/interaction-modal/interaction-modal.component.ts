import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { InteractionType } from '../../../../core/api/types';

interface InteractionPayload {
  type: InteractionType;
  occurredAt: string;
  summary: string;
  detail: string;
  promoteToContacted: boolean;
}

@Component({
  selector: 'tk-interaction-modal',
  standalone: true,
  imports: [FormsModule, IconComponent, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tk-modal-shell title="Registrar interacción"
                    [subtitle]="subtitle ?? null"
                    [width]="520"
                    (closed)="closed.emit()">
      <label class="fld">
        <span class="lbl">Tipo <span class="req">*</span></span>
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

      <label class="fld">
        <span class="lbl">Fecha y hora <span class="req">*</span></span>
        <input type="datetime-local" class="inp" [value]="occurredAt()" (input)="occurredAt.set($any($event.target).value)" />
      </label>

      <label class="fld">
        <span class="lbl">Resumen <span class="req">*</span></span>
        <input class="inp" placeholder="¿Qué pasó? Una línea." [value]="summary()" (input)="summary.set($any($event.target).value)" />
      </label>

      <label class="fld">
        <span class="lbl">Detalle (opcional)</span>
        <textarea class="ta" placeholder="Notas adicionales, próximos pasos, contexto…"
                  [value]="detail()" (input)="detail.set($any($event.target).value)"></textarea>
      </label>

      @if (showPromote) {
        <button type="button" class="cb" (click)="promote.set(!promote())" [class.is-on]="promote()">
          <span class="cb-box">@if (promote()) { <tk-icon name="check" [size]="11" /> }</span>
          <span class="cb-body">
            <span class="cb-tt">Pasar a Contactada</span>
            <span class="cb-st">Detectamos un primer outreach. Te conviene actualizar el estado.</span>
          </span>
        </button>
      }

      <div footer>
        <button type="button" class="btn ghost" (click)="closed.emit()">Cancelar</button>
        <button type="button" class="btn primary" [disabled]="!summary().trim()" (click)="onSubmit()">
          <tk-icon name="check" [size]="14" />Registrar
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
    .inp, .ta {
      padding: 0 12px; height: 34px;
      border: 1px solid var(--border-default);
      border-radius: 8px; background: var(--bg-surface);
      color: var(--t-primary); font-size: 13px; outline: 0;
      font-family: var(--font-ui);
    }
    .ta { min-height: 72px; padding: 10px 12px; line-height: 1.5; resize: vertical; }
    .chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 999px;
      background: var(--bg-surface); color: var(--t-secondary);
      border: 1px solid var(--border-default);
      font-size: 12px; font-weight: 500;
      cursor: pointer;
    }
    .chip.is-active {
      background: var(--c-cobalt-50); color: var(--c-cobalt-700);
      border-color: var(--c-cobalt-300);
    }
    .cb {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 12px; width: 100%; text-align: left;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
      border-radius: 8px; cursor: pointer;
    }
    .cb.is-on { background: var(--c-cobalt-50); border-color: var(--c-cobalt-200); }
    .cb-box {
      width: 16px; height: 16px; border-radius: 4px; margin-top: 1px;
      border: 1.5px solid var(--border-strong);
      display: flex; align-items: center; justify-content: center;
      color: #fff; flex-shrink: 0;
    }
    .cb.is-on .cb-box { background: var(--c-cobalt-500); border-color: var(--c-cobalt-500); }
    .cb-body { display: flex; flex-direction: column; flex: 1; }
    .cb-tt { font-size: 12px; font-weight: 500; color: var(--t-primary); }
    .cb-st { font-size: 11px; color: var(--t-tertiary); margin-top: 2px; }

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
export class InteractionModalComponent {
  @Input() subtitle?: string;
  @Input() showPromote = false;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<InteractionPayload>();

  readonly typeOptions: Array<{ value: InteractionType; label: string; icon: string }> = [
    { value: 'EMAIL',    label: 'Email',    icon: 'mail' },
    { value: 'CALL',     label: 'Llamada',  icon: 'phone' },
    { value: 'MEETING',  label: 'Reunión',  icon: 'handshake' },
    { value: 'LINKEDIN', label: 'LinkedIn', icon: 'linkedin' },
    { value: 'OTHER',    label: 'Otro',     icon: 'message' },
  ];

  readonly type = signal<InteractionType>('EMAIL');
  readonly occurredAt = signal<string>(this.nowLocal());
  readonly summary = signal<string>('');
  readonly detail = signal<string>('');
  readonly promote = signal<boolean>(true);

  private nowLocal(): string {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  onSubmit(): void {
    if (!this.summary().trim()) return;
    this.submitted.emit({
      type: this.type(),
      occurredAt: new Date(this.occurredAt()).toISOString(),
      summary: this.summary().trim(),
      detail: this.detail().trim(),
      promoteToContacted: this.showPromote && this.promote(),
    });
  }
}
