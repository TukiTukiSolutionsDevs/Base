import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'tk-toast',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toast(); as t) {
      <div class="tk-toast" [attr.data-kind]="t.kind">
        <tk-icon [name]="iconFor(t.kind)" [size]="14" [style.color]="colorFor(t.kind)" />
        <span>{{ t.text }}</span>
      </div>
    }
  `,
  styles: [`
    .tk-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%);
      background: var(--c-ink-900); color: #fff;
      padding: 10px 16px; border-radius: 9999px;
      font-size: 13px; box-shadow: var(--shadow-lg);
      z-index: var(--z-toast);
      animation: toast-in var(--dur-base) var(--ease-out);
      display: flex; align-items: center; gap: 8px;
    }
    :host-context(.dark) .tk-toast {
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      color: var(--t-primary);
    }
  `],
})
export class ToastComponent {
  private readonly svc = inject(ToastService);
  readonly toast = computed(() => this.svc.toast());

  iconFor(kind: 'success' | 'info' | 'error'): string {
    return kind === 'error' ? 'alert' : kind === 'info' ? 'message' : 'check';
  }

  colorFor(kind: 'success' | 'info' | 'error'): string {
    return kind === 'error' ? 'var(--c-risk-high)'
         : kind === 'info'  ? 'var(--c-cobalt-500)'
         : 'var(--c-risk-low)';
  }
}
