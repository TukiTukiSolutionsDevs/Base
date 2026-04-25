import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, tap } from 'rxjs';
import { AuthUser, LoginRequest, LoginResponse } from './auth.types';

const API_BASE = '/api/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _ready = signal<boolean>(false);

  readonly user = computed(() => this._user());
  readonly isAuthenticated = computed(() => this._user() !== null);
  readonly ready = computed(() => this._ready());

  /**
   * Llamado al bootstrap (APP_INITIALIZER). Intenta recuperar la sesión actual
   * desde la cookie HTTP-only. No falla la app si no hay sesión: simplemente
   * marca user=null para que el guard redirija al login.
   */
  async loadCurrentUser(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ user: AuthUser }>(`${API_BASE}/me`, { withCredentials: true }).pipe(
          catchError(() => of(null)),
        ),
      );
      this._user.set(res?.user ?? null);
    } finally {
      this._ready.set(true);
    }
  }

  login(payload: LoginRequest) {
    return this.http
      .post<LoginResponse>(`${API_BASE}/login`, payload, { withCredentials: true })
      .pipe(tap((res) => this._user.set(res.user)));
  }

  async logout(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE}/logout`, {}, { withCredentials: true }).pipe(
          catchError(() => of(null)),
        ),
      );
    } finally {
      this._user.set(null);
      this.router.navigate(['/login']);
    }
  }

  /** Llamado por el interceptor cuando recibe 401 */
  onUnauthorized(): void {
    this._user.set(null);
    if (this.router.url !== '/login') {
      this.router.navigate(['/login'], {
        queryParams: { returnUrl: this.router.url },
      });
    }
  }
}
