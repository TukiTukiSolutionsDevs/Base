import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'tk-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen grid place-items-center bg-gradient-to-br from-ink-50 via-white to-accent-50 px-4">
      <div class="w-full max-w-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-white grid place-items-center font-bold text-lg shadow">T</div>
          <div>
            <div class="text-base font-semibold text-ink-900 leading-tight">TUKI · Expertia</div>
            <div class="text-[11px] text-ink-400 leading-tight">acceso restringido</div>
          </div>
        </div>

        <div class="card p-6">
          <h1 class="text-lg font-semibold text-ink-900 mb-1">Ingresar</h1>
          <p class="text-xs text-ink-500 mb-5">
            Solo cuentas autorizadas (TukiTuki / Expertia).
          </p>

          <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-3">
            <div>
              <label class="section-label block mb-1">Usuario</label>
              <input class="input" autocomplete="username" formControlName="username" />
            </div>
            <div>
              <label class="section-label block mb-1">Contraseña</label>
              <input class="input" type="password" autocomplete="current-password" formControlName="password" />
            </div>

            @if (errorMsg(); as msg) {
              <div class="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                {{ msg }}
              </div>
            }

            <button type="submit"
                    class="btn-primary w-full mt-2"
                    [disabled]="form.invalid || loading()">
              @if (loading()) { Validando… } @else { Ingresar }
            </button>
          </form>
        </div>

        <p class="text-[11px] text-ink-400 mt-4 text-center">
          datos confidenciales · uso comercial interno
        </p>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal<boolean>(false);
  readonly errorMsg = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(64)]],
    password: ['', [Validators.required, Validators.maxLength(255)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.errorMsg.set(null);
    try {
      await firstValueFrom(this.auth.login(this.form.getRawValue()));
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
      this.router.navigateByUrl(returnUrl);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      this.errorMsg.set(
        status === 401 ? 'Usuario o contraseña incorrectos.' : 'No pudimos validar tu acceso. Intentá de nuevo.',
      );
    } finally {
      this.loading.set(false);
    }
  }
}
