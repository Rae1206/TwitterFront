import { adminRoles, type AppRole } from './session.model';

interface JwtClaims {
  role: AppRole | null;
  userId: string | null;
}

/** Claves habituales de claims para obtener el rol desde el payload del JWT. */
const roleClaimKeys = [
  'role',
  'roles',
  'appRole',
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
] as const;

/** Claves habituales de claims para obtener el ID de usuario desde el payload del JWT. */
const userIdClaimKeys = [
  'sub',
  'id',
  'userId',
  'UserId',
  'userid',
  'uid',
  'nameid',
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier',
] as const;

/**
 * @description Decodifica un token JWT y extrae los claims de rol e ID de usuario.
 * @param token Token JWT en formato string.
 * @returns Un objeto `JwtClaims` que contiene el rol y el ID de usuario decodificados, o null si no se encontraron.
 */
export function readJwtClaims(token: string | null): JwtClaims {
  if (!token) {
    return { role: null, userId: null };
  }

  const payload = parseJwtPayload(token);

  return {
    role: readRoleClaim(payload),
    userId: readUserIdClaim(payload),
  };
}

/**
 * Extrae y decodifica la sección del payload (segunda sección) de un token JWT.
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const decodedPayload = decodeBase64Url(payload);
    const parsedPayload = JSON.parse(decodedPayload);

    return isRecord(parsedPayload) ? parsedPayload : null;
  } catch {
    return null;
  }
}

/**
 * Decodifica una cadena Base64Url de forma segura para entornos de navegador.
 */
function decodeBase64Url(value: string): string {
  if (typeof globalThis.atob !== 'function') {
    throw new Error('La decodificación Base64 no está disponible en este entorno.');
  }

  const normalizedValue = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddedValue = normalizedValue.padEnd(normalizedValue.length + ((4 - (normalizedValue.length % 4)) % 4), '=');
  const binaryString = globalThis.atob(paddedValue);
  const bytes = Uint8Array.from(binaryString, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

/**
 * Busca y extrae el claim de rol en el payload usando las claves predefinidas.
 */
function readRoleClaim(payload: Record<string, unknown> | null): AppRole | null {
  if (!payload) {
    return null;
  }

  for (const key of roleClaimKeys) {
    const claim = payload[key];
    const role = normalizeRoleClaim(claim);

    if (role) {
      return role;
    }
  }

  return null;
}

/**
 * Busca y extrae el claim de ID de usuario en el payload usando las claves predefinidas.
 */
function readUserIdClaim(payload: Record<string, unknown> | null): string | null {
  if (!payload) {
    return null;
  }

  for (const key of userIdClaimKeys) {
    const claim = payload[key];

    if (typeof claim === 'string' && claim.trim()) {
      return claim;
    }

    if (typeof claim === 'number' && Number.isFinite(claim)) {
      return String(claim);
    }
  }

  return null;
}

/**
 * Normaliza el valor de un claim de rol, soportando tanto strings individuales como arrays.
 */
function normalizeRoleClaim(claim: unknown): AppRole | null {
  if (typeof claim === 'string') {
    return normalizeRoleValue(claim);
  }

  if (Array.isArray(claim)) {
    for (const entry of claim) {
      if (typeof entry !== 'string') {
        continue;
      }

      const role = normalizeRoleValue(entry);

      if (role) {
        return role;
      }
    }
  }

  return null;
}

/**
 * Verifica si un rol extraído coincide con los roles de administración del sistema.
 */
function normalizeRoleValue(role: string): AppRole | null {
  const trimmedRole = role.trim();

  if (!trimmedRole) {
    return null;
  }

  const knownRole = adminRoles.find((adminRole) => adminRole === trimmedRole);

  return knownRole ?? trimmedRole;
}

/**
 * Type guard para validar que un valor decodificado es un objeto clave-valor de TypeScript.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
