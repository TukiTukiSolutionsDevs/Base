import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import { IconComponent } from '../icon/icon.component';
import { AuthService } from '../../../core/auth/auth.service';

interface RailItem { id: string; label: string; icon: string; route: string; }

@Component({
  selector: 'tk-app-rail',
  standalone: true,
  imports: [IconComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="tk-rail">
      <a [routerLink]="['/today']" class="tk-rail-logo" title="TUKI">
        <tk-icon name="logo" [size]="28" />
      </a>

      @for (it of items; track it.id) {
        <a [routerLink]="[it.route]"
           class="tk-rail-item"
           [class.is-active]="active() === it.id"
           [title]="it.label">
          <tk-icon [name]="it.icon" [size]="18" />
          <span class="tk-rail-tip">{{ it.label }}</span>
        </a>
      }

      <div class="tk-rail-spacer"></div>

      <button type="button" class="tk-rail-item" title="Salir" (click)="logout()">
        <tk-icon name="settings" [size]="18" />
        <span class="tk-rail-tip">Salir</span>
      </button>

      @if (initial(); as ini) {
        <div class="tk-rail-user" [title]="user()?.displayName ?? ''">{{ ini }}</div>
      }
    </aside>
  `,
  styles: [`
    .tk-rail {
      width: 56px;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex; flex-direction: column; align-items: center;
      padding: 12px 0; gap: 4px;
      flex-shrink: 0;
      z-index: var(--z-rail);
    }
    .tk-rail-logo {
      margin-bottom: 12px;
      color: var(--c-cobalt-500);
      display: inline-flex;
    }
    .tk-rail-item {
      position: relative;
      width: 36px; height: 36px;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      color: var(--t-secondary);
      background: transparent;
      transition: all var(--dur-base) var(--ease-out);
      cursor: pointer; border: 0;
    }
    .tk-rail-item:hover {
      background: var(--bg-hover);
      color: var(--t-primary);
    }
    .tk-rail-item.is-active {
      background: var(--c-cobalt-50);
      color: var(--c-cobalt-700);
    }
    .tk-rail-tip {
      position: absolute;
      left: calc(100% + 10px);
      background: var(--c-ink-900); color: #fff;
      padding: 4px 8px; border-radius: 6px;
      font-size: 12px;
      white-space: nowrap;
      box-shadow: var(--shadow-md);
      opacity: 0; pointer-events: none;
      transition: opacity var(--dur-fast) var(--ease-out);
      z-index: 100;
    }
    .tk-rail-item:hover .tk-rail-tip { opacity: 1; }
    .tk-rail-spacer { flex: 1; }
    .tk-rail-user {
      width: 32px; height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #3a5ef0, #9333ea);
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 600;
      margin-top: 8px;
      text-transform: uppercase;
    }
  `],
})
export class AppRailComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly items: RailItem[] = [
    { id: 'today',    label: 'Hoy',       icon: 'home',   route: '/today' },
    { id: 'pipeline', label: 'Pipeline',  icon: 'kanban', route: '/pipeline' },
    { id: 'universe', label: 'Universo',  icon: 'globe',  route: '/universe' },
  ];

  readonly user = this.auth.user;

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  readonly active = computed(() => {
    const u = this.url()?.urlAfterRedirects ?? this.router.url;
    if (u.startsWith('/today')) return 'today';
    if (u.startsWith('/pipeline')) return 'pipeline';
    if (u.startsWith('/universe')) return 'universe';
    return '';
  });

  readonly initial = computed(() => {
    const u = this.user();
    return (u?.displayName?.[0] ?? u?.username?.[0] ?? '?').toUpperCase();
  });

  logout(): void { void this.auth.logout(); }
}
