import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, Observable, shareReplay, switchMap, throwError } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { AuthResponse } from './auth.models';
import { SessionService } from './session.service';

/**
 * Token de contexto para identificar si una petición HTTP ya ha sido reintentada
 * tras fallar por un error de autenticación (401).
 */
const authRetryContext = new HttpContextToken<boolean>(() => false);

/**
 * Observable compartido para evitar múltiples peticiones concurrentes de renovación
 * del token de acceso (Token Refresh).
 */
let refreshRequest$: Observable<AuthResponse> | null = null;

/**
 * Interceptor HTTP encargado de adjuntar el token de acceso Bearer a las peticiones
 * salientes y de manejar automáticamente la renovación del token si expira (error 401).
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const sessionService = inject(SessionService);
  const authApiService = inject(AuthApiService);
  const router = inject(Router);

  // Adjuntar el token si corresponde
  const request = shouldAttachAuthHeader(req.url)
    ? attachBearerToken(req, sessionService.getAccessToken())
    : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      // Si no debemos intentar renovar el token, propagamos el error directamente
      if (!shouldAttemptRefresh(error, req.url, request.context.get(authRetryContext))) {
        return throwError(() => error);
      }

      const refreshToken = sessionService.getRefreshToken();

      // Si no tenemos token de refresco, cerramos sesión y fallamos
      if (!refreshToken) {
        handleAuthFailure(sessionService, router);
        return throwError(() => error);
      }

      // Iniciamos o nos unimos al flujo de renovación del token de acceso
      return renewAccessToken(authApiService, sessionService, refreshToken).pipe(
        switchMap((response) => {
          // Reintentamos la petición original adjuntando el nuevo token
          const retryRequest = attachBearerToken(
            req.clone({
              context: req.context.set(authRetryContext, true),
            }),
            response.token,
          );

          return next(retryRequest);
        }),
        catchError((refreshError: unknown) => {
          // Si la renovación también falla, limpiamos la sesión y redirigimos al login
          handleAuthFailure(sessionService, router);
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};

/**
 * Realiza la renovación del token de acceso de manera compartida (shareReplay)
 * para evitar que peticiones simultáneas disparen múltiples llamados de renovación.
 */
function renewAccessToken(
  authApiService: AuthApiService,
  sessionService: SessionService,
  refreshToken: string,
): Observable<AuthResponse> {
  if (!refreshRequest$) {
    refreshRequest$ = authApiService.renew({ refreshToken }).pipe(
      shareReplay(1),
      finalize(() => {
        refreshRequest$ = null;
      }),
    );
  }

  return refreshRequest$.pipe(
    switchMap((response) => {
      sessionService.startSession(response);
      return [response];
    }),
  );
}

/**
 * Clona una petición y le adjunta la cabecera 'Authorization' con el token Bearer provisto.
 */
function attachBearerToken<T extends { clone: (update: { setHeaders: Record<string, string> }) => T }>(request: T, token: string | null) {
  if (!token) {
    return request;
  }

  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

/**
 * Determina si se debe adjuntar el token de autenticación a una URL específica.
 * Excluye los endpoints de autenticación propios y URLs de almacenamiento externo.
 */
function shouldAttachAuthHeader(url: string): boolean {
  return !isAuthEndpoint(url) && !isExternalStorageUrl(url);
}

/**
 * Determina si se debe intentar renovar el token basándose en el tipo de error (401)
 * y si es que la petición ya fue reintentada anteriormente.
 */
function shouldAttemptRefresh(error: unknown, url: string, hasRetried: boolean): error is HttpErrorResponse {
  return error instanceof HttpErrorResponse && error.status === 401 && !hasRetried && shouldAttachAuthHeader(url);
}

/**
 * Comprueba si la URL corresponde a un endpoint del módulo de autenticación.
 */
function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/auth/login') || url.includes('/api/auth/renew');
}

/**
 * Comprueba si la URL apunta a un servicio de almacenamiento externo (DigitalOcean Spaces).
 */
function isExternalStorageUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }

  try {
    return new URL(url).hostname.toLowerCase().endsWith('.digitaloceanspaces.com');
  } catch {
    return false;
  }
}

/**
 * Maneja el fallo total de autenticación, limpiando los datos de sesión y
 * redirigiendo al usuario a la página de login.
 */
function handleAuthFailure(sessionService: SessionService, router: Router): void {
  sessionService.clearSession();
  void router.navigate(['/login']);
}
