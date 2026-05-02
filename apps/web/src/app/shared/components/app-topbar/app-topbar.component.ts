import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { IconComponent } from '../icon/icon.component';

interface TitleSet { eyebrow: string; title: string; }

const TITLES: Record<string, TitleSet> = {
  today:    { eyebrow: 'Tu día',         title: 'Hoy' },
  pipeline: { eyebrow: 'Seguimiento',    title: 'Pipeline' },
  universe: { eyebrow: 'Descubrimiento', title: 'Universo' },
};

@Component({
  selector: 'tk-app-topbar',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="tk-topbar">
      <div class="tk-titles">
        <span class="tk-eyebrow">{{ titleSet().eyebrow }}</span>
        <span class="tk-title">{{ titleSet().title }}</span>
      </div>
      <div class="tk-spacer"></div>

      <label class="tk-search">
        <tk-icon name="search" [size]="14" />
        <input
          type="text"
          placeholder="Buscar empresa, contacto, RUC…"
          [value]="query()"
          (input)="onInput($event)"
        />
        <kbd>⌘K</kbd>
      </label>

      <button type="button" class="tk-iconbtn" title="Tema" (click)="toggleTheme.emit()">
        <tk-icon name="moon" [size]="16" />
      </button>

      <button type="button" class="tk-newbtn" (click)="add.emit()">
        <tk-icon name="plus" [size]="14" />
        <span>Nueva acción</span>
      </button>
    </header>
  `,
  styles: [`
    :host { display: block; }
    .tk-topbar {
      height: 56px;
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      display: flex; align-items: center;
      padding: 0 24px; gap: 16px;
      flex-shrink: 0;
    }
    .tk-titles { display: flex; flex-direction: column; line-height: 1.1; white-space: nowrap; }
    .tk-eyebrow {
      font-size: 11px; color: var(--t-tertiary);
      text-transform: uppercase; letter-spacing: 0.06em; font-weight: 500;
    }
    .tk-title {
      font-size: 16px; font-weight: 600;
      font-family: var(--font-display);
      color: var(--t-primary);
    }
    .tk-spacer { flex: 1; }
    .tk-search {
      display: flex; align-items: center; gap: 8px;
      height: 34px; padding: 0 12px; width: 320px;
      background: var(--bg-sunken);
      border: 1px solid var(--border-subtle);
      border-radius: 8px;
      color: var(--t-tertiary);
    }
    .tk-search input {
      flex: 1; border: 0; outline: 0; background: transparent;
      color: var(--t-primary); font-size: 13px;
    }
    .tk-search input::placeholder { color: var(--t-tertiary); }
    .tk-search kbd {
      font-size: 10px; font-family: var(--font-mono);
      padding: 2px 6px; border-radius: 4px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--t-tertiary);
    }
    .tk-iconbtn {
      width: 34px; height: 34px;
      display: inline-flex; align-items: center; justify-content: center;
      background: var(--bg-surface); border: 1px solid var(--border-default);
      border-radius: 8px; color: var(--t-secondary);
      cursor: pointer;
    }
    .tk-iconbtn:hover { background: var(--bg-hover); color: var(--t-primary); }
    .tk-newbtn {
      display: inline-flex; align-items: center; gap: 8px;
      height: 34px; padding: 0 14px;
      background: var(--bg-surface); color: var(--t-primary);
      border: 1px solid var(--border-default); border-radius: 8px;
      font-size: 13px; font-weight: 500;
      cursor: pointer;
    }
    .tk-newbtn:hover { background: var(--bg-hover); }
  `],
})
export class AppTopbarComponent {
  private readonly router = inject(Router);

  @Input({ alias: 'query' }) set queryIn(v: string) { this._q.set(v ?? ''); }
  @Output() queryChange = new EventEmitter<string>();
  @Output() add = new EventEmitter<void>();
  @Output() toggleTheme = new EventEmitter<void>();

  private readonly _q = signal('');
  readonly query = computed(() => this._q());

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  readonly titleSet = computed<TitleSet>(() => {
    const u = this.url()?.urlAfterRedirects ?? this.router.url;
    if (u.startsWith('/pipeline')) return TITLES['pipeline'];
    if (u.startsWith('/universe')) return TITLES['universe'];
    return TITLES['today'];
  });

  onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this._q.set(v);
    this.queryChange.emit(v);
  }
}
