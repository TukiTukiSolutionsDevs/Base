import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Interceptor funcional:
 *  - Asegura `withCredentials: true` en TODA request al API (cookie HTTP-only).
 *  - Captura 401 globalmente y notifica al AuthService para limpiar sesión + redirigir.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApi = req.url.startsWith('/api');
  const cloned = isApi && !req.withCredentials
    ? req.clone({ withCredentials: true })
    : req;

  const auth = inject(AuthService);

  return next(cloned).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401 && isApi) {
        // Evitamos loop si el 401 vino justamente del /me al bootstrap
        if (!req.url.endsWith('/auth/me')) {
          auth.onUnauthorized();
        }
      }
      return throwError(() => err);
    }),
  );
};
