import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { adminRoles } from './session.model';
import { SessionService } from './session.service';

/**
 * Crea un árbol de URL para redirigir al usuario a la página de inicio de sesión,
 * guardando la ruta de origen en los parámetros de consulta.
 */
function createLoginRedirect(returnUrl: string) {
  const router = inject(Router);

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl },
  });
}

/**
 * Guard de ruta para asegurar que solo los usuarios autenticados puedan acceder.
 * Redirige al login si no hay una sesión activa.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const sessionService = inject(SessionService);

  return sessionService.isAuthenticated() ? true : createLoginRedirect(state.url);
};

/**
 * Guard de rutas hijas para asegurar que solo los usuarios autenticados puedan acceder.
 * Redirige al login si no hay una sesión activa.
 */
export const authChildGuard: CanActivateChildFn = (_childRoute, state) => {
  const sessionService = inject(SessionService);

  return sessionService.isAuthenticated() ? true : createLoginRedirect(state.url);
};

/**
 * Guard que previene que los usuarios autenticados vuelvan a pantallas públicas como el login.
 * Redirige a la página de inicio (/home) si ya hay una sesión activa.
 */
export const guestGuard: CanActivateFn = () => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  return sessionService.isAuthenticated() ? router.createUrlTree(['/home']) : true;
};

/**
 * Guard de ruta para restringir el acceso únicamente a usuarios administradores.
 * Redirige al login si no está autenticado, o a la página de inicio si no posee un rol administrativo.
 */
export const adminGuard: CanActivateFn = (_route, state) => {
  const sessionService = inject(SessionService);
  const router = inject(Router);

  if (!sessionService.isAuthenticated()) {
    return createLoginRedirect(state.url);
  }

  return sessionService.hasRole(adminRoles) ? true : router.createUrlTree(['/home']);
};
