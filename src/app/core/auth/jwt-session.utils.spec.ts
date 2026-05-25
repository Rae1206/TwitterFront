import { readJwtClaims } from './jwt-session.utils';

describe('readJwtClaims', () => {
  // Test que valida la lectura de rol y usuario desde claims comunes del JWT.
  it('reads role and user id from common claim keys', () => {
    const token = createJwt({
      roles: ['User', 'Admin'],
      userId: 99,
    });

    expect(readJwtClaims(token)).toEqual({
      role: 'User',
      userId: '99',
    });
  });

  // Test que valida el soporte de claims con esquema para rol y subject.
  it('supports schema-based role and subject claims', () => {
    const token = createJwt({
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'SuperAdmin',
      sub: 'user-42',
    });

    expect(readJwtClaims(token)).toEqual({
      role: 'SuperAdmin',
      userId: 'user-42',
    });
  });

  // Test que valida la respuesta nula cuando el payload del JWT es inválido.
  it('returns null claims for invalid payloads', () => {
    expect(readJwtClaims('bad-token')).toEqual({ role: null, userId: null });
    expect(readJwtClaims(null)).toEqual({ role: null, userId: null });
  });
});

function createJwt(payload: Record<string, unknown>): string {
  const header = encodeBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  return `${header}.${encodeBase64Url(JSON.stringify(payload))}.signature`;
}

function encodeBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
