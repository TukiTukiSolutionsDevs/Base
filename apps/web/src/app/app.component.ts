import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'tk-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showChrome()) {
      <div class="min-h-screen flex flex-col">
        <header class="border-b border-ink-100 bg-white/80 backdrop-blur sticky top-0 z-10">
          <div class="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-white grid place-items-center font-bold shadow-sm">T</div>
              <div>
                <div class="text-sm font-semibold leading-tight">TUKI · Expertia</div>
                <div class="text-[11px] text-ink-400 leading-tight">Prospección B2B Perú · 25k+ empresas</div>
              </div>
            </div>
            @if (user(); as u) {
              <div class="flex items-center gap-3">
                <div class="text-right hidden sm:block">
                  <div class="text-xs font-semibold text-ink-700 leading-tight">{{ u.displayName }}</div>
                  <div class="text-[11px] text-ink-400 leading-tight">{{ u.organization }}</div>
                </div>
                <div class="w-8 h-8 rounded-full bg-accent-100 text-accent-700 grid place-items-center font-semibold text-xs uppercase">
                  {{ initial() }}
                </div>
                <button type="button" class="btn-ghost text-xs" (click)="logout()">Salir</button>
              </div>
            }
          </div>
        </header>
        <main class="flex-1">
          <router-outlet />
        </main>
        <footer class="border-t border-ink-100 py-4 text-center text-xs text-ink-400">
          Datos: BASE TUKI TUKI · EXPERTIA 2026 · uso comercial interno
        </footer>
      </div>
    } @else {
      <router-outlet />
    }
  `,
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly user = this.auth.user;

  /** No mostramos el chrome (header/footer) en /login */
  readonly showChrome = computed<boolean>(() => {
    const url = this.router.url;
    return !url.startsWith('/login');
  });

  readonly initial = computed<string>(() => {
    const u = this.user();
    return (u?.displayName?.[0] ?? u?.username?.[0] ?? '?').toUpperCase();
  });

  logout(): void {
    void this.auth.logout();
  }
}
