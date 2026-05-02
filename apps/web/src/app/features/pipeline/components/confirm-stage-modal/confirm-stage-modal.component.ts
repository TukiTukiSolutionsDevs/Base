import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';
import { ModalShellComponent } from '../modal-shell/modal-shell.component';
import { PipelineStatus } from '../../../../core/api/types';

@Component({
  selector: 'tk-confirm-stage-modal',
  standalone: true,
  imports: [IconComponent, ModalShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <tk-modal-shell [title]="modalTitle()"
                    [subtitle]="subtitle ?? null"
                    [width]="460"
                    (closed)="closed.emit()">
      <div class="banner" [class.is-won]="isWon()">
        @if (isWon()) {
          🎉 Vas a marcar esta cuenta como Ganada. Buena.
        } @else {
          Esta acción mueve la cuenta a Perdida. Necesitamos una razón para aprender.
        }
      </div>
      @if (!isWon()) {
        <label class="fld">
          <span class="lbl">¿Por qué la perdimos? <span class="req">*</span></span>
          <textarea class="ta" placeholder="Eligieron a otro proveedor / sin presupuesto / no era el ICP / …"
                    [value]="reason()" (input)="reason.set($any($event.target).value)"></textarea>
        </label>
      }

      <div footer>
        <button type="button" class="btn ghost" (click)="closed.emit()">Cancelar</button>
        <button type="button" class="btn"
                [class.primary]="isWon()" [class.danger]="!isWon()"
                [disabled]="!isWon() && !reason().trim()"
                (click)="onConfirm()">
          <tk-icon name="check" [size]="14" />Confirmar
        </button>
      </div>
    </tk-modal-shell>
  `,
  styles: [`
    .banner {
      padding: 14px; border-radius: 10px;
      background: var(--c-risk-high-bg); color: var(--c-risk-high);
      font-size: 13px; font-weight: 500;
    }
    .banner.is-won { background: var(--c-risk-low-bg); color: var(--c-risk-low); }

    .fld { display: flex; flex-direction: column; gap: 6px; }
    .lbl {
      font-size: 11px; font-weight: 500; color: var(--t-secondary);
      text-transform: uppercase; letter-spacing: 0.04em;
    }
    .req { color: var(--c-risk-high); margin-left: 3px; }
    .ta {
      min-height: 72px; padding: 10px 12px;
      border: 1px solid var(--border-default);
      border-radius: 8px; background: var(--bg-surface);
      color: var(--t-primary); font-size: 13px; line-height: 1.5;
      outline: 0; font-family: var(--font-ui); resize: vertical;
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
    .btn.danger  { background: var(--c-risk-high); color: #fff; border-color: var(--c-risk-high); }
    .btn.primary:hover { background: var(--c-cobalt-600); }
    .btn.danger:hover  { background: #b91c1c; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `],
})
export class ConfirmStageModalComponent {
  @Input({ required: true }) set targetStage(v: PipelineStatus) { this._target.set(v); }
  @Input() subtitle?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<{ status: PipelineStatus; lostReason?: string }>();

  private readonly _target = signal<PipelineStatus>('WON');
  readonly reason = signal<string>('');

  readonly isWon = computed(() => this._target() === 'WON');
  readonly modalTitle = computed(() => this.isWon() ? 'Marcar como Ganada' : 'Marcar como Perdida');

  onConfirm(): void {
    if (this.isWon()) {
      this.confirmed.emit({ status: 'WON' });
    } else {
      const reason = this.reason().trim();
      if (!reason) return;
      this.confirmed.emit({ status: 'LOST', lostReason: reason });
    }
  }
}
