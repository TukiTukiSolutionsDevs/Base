import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { IconComponent } from '../../../../shared/components/icon/icon.component';

@Component({
  selector: 'tk-modal-shell',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tk-backdrop" (click)="closed.emit()"></div>
    <div class="tk-modal" [style.width.px]="width">
      <header class="tk-modal-h">
        <div class="tk-modal-h-l">
          <h3>{{ title }}</h3>
          @if (subtitle) { <p>{{ subtitle }}</p> }
        </div>
        <button type="button" class="tk-modal-close" (click)="closed.emit()" aria-label="Cerrar">
          <tk-icon name="x" [size]="14" />
        </button>
      </header>
      <div class="tk-modal-body">
        <ng-content></ng-content>
      </div>
      <footer class="tk-modal-f">
        <ng-content select="[footer]"></ng-content>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .tk-backdrop {
      position: fixed; inset: 0;
      background: var(--bg-overlay);
      z-index: var(--z-modal);
      animation: fade-in var(--dur-base) var(--ease-out);
    }
    .tk-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      max-width: 92vw; max-height: 90vh;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: 14px;
      box-shadow: var(--shadow-xl);
      z-index: var(--z-modal);
      display: flex; flex-direction: column;
      animation: modal-pop var(--dur-slow) var(--ease-out);
    }
    .tk-modal-h {
      padding: 18px 22px 14px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: flex-start; gap: 12px;
    }
    .tk-modal-h-l { flex: 1; }
    .tk-modal-h h3 {
      margin: 0; font-family: var(--font-display);
      font-size: 16px; font-weight: 600; color: var(--t-primary);
    }
    .tk-modal-h p { margin: 2px 0 0; font-size: 12px; color: var(--t-tertiary); }
    .tk-modal-close {
      width: 28px; height: 28px; border-radius: 6px;
      color: var(--t-secondary);
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: 0; cursor: pointer;
    }
    .tk-modal-close:hover { background: var(--bg-hover); color: var(--t-primary); }
    .tk-modal-body {
      padding: 18px 22px;
      flex: 1; overflow-y: auto;
      display: flex; flex-direction: column; gap: 16px;
    }
    .tk-modal-f {
      padding: 12px 22px;
      border-top: 1px solid var(--border-subtle);
      display: flex; gap: 8px; justify-content: flex-end;
      background: var(--bg-sunken);
      border-radius: 0 0 14px 14px;
    }
  `],
})
export class ModalShellComponent {
  @Input() title = '';
  @Input() subtitle: string | null = null;
  @Input() width = 480;
  @Output() closed = new EventEmitter<void>();
}
