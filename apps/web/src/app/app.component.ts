import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { AppRailComponent } from './shared/components/app-rail/app-rail.component';
import { AppTopbarComponent } from './shared/components/app-topbar/app-topbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { TaskModalComponent, TaskModalPayload } from './features/pipeline/components/task-modal/task-modal.component';
import { TasksApiService } from './core/api/tasks-api.service';
import { ToastService } from './shared/services/toast.service';

@Component({
  selector: 'tk-root',
  standalone: true,
  imports: [RouterOutlet, AppRailComponent, AppTopbarComponent, ToastComponent, TaskModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showChrome()) {
      <div class="tk-shell">
        <tk-app-rail />
        <div class="tk-main">
          <tk-app-topbar (toggleTheme)="toggleTheme()" (add)="openQuickTask()" />
          <main class="tk-content">
            <router-outlet />
          </main>
        </div>
      </div>
    } @else {
      <router-outlet />
    }

    @if (showQuickTask()) {
      <tk-task-modal
        [initialPipelineEntryId]="null"
        [quickAction]="true"
        (closed)="showQuickTask.set(false)"
        (submitted)="onQuickTaskSubmit($event)" />
    }

    <tk-toast />
  `,
  styles: [`
    :host { display: block; height: 100vh; }
    .tk-shell {
      display: flex; height: 100vh;
      background: var(--bg-app);
    }
    .tk-main {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column;
    }
    .tk-content { flex: 1; min-height: 0; overflow: hidden; }
  `],
})
export class AppComponent {
  private readonly router = inject(Router);
  private readonly tasksApi = inject(TasksApiService);
  private readonly toast = inject(ToastService);

  readonly theme = signal<'light' | 'dark'>('light');
  readonly showQuickTask = signal<boolean>(false);

  openQuickTask(): void {
    this.showQuickTask.set(true);
  }

  onQuickTaskSubmit(payload: TaskModalPayload): void {
    /* Tarea libre — sin pipelineEntryId asociado.
     * El usuario puede attacharla a una empresa después desde el drawer. */
    this.tasksApi.create({
      description: payload.description,
      dueAt: payload.dueAt,
      type: payload.type,
    }).subscribe({
      next: () => {
        this.showQuickTask.set(false);
        this.toast.success('Acción creada');
      },
      error: () => this.toast.error('No se pudo crear la acción'),
    });
  }

  private readonly url = toSignal(
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)),
  );

  readonly showChrome = computed<boolean>(() => {
    const u = this.url()?.urlAfterRedirects ?? this.router.url;
    return !u.startsWith('/login');
  });

  constructor() {
    /* persistir tema en localStorage */
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('tuki:theme')) as
      'light' | 'dark' | null;
    if (saved === 'dark' || saved === 'light') this.theme.set(saved);

    effect(() => {
      const t = this.theme();
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', t === 'dark');
      }
      if (typeof localStorage !== 'undefined') localStorage.setItem('tuki:theme', t);
    });
  }

  toggleTheme(): void {
    this.theme.update(t => t === 'light' ? 'dark' : 'light');
  }
}
