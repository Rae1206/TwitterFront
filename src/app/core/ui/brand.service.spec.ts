import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BrandService } from './brand.service';

const STORAGE_KEY = 'twitter.accent-color';

describe('BrandService', () => {
  let storage: Storage;
  let style: Map<string, string>;

  beforeEach(() => {
    TestBed.resetTestingModule();
    storage = createStorage();
    style = new Map<string, string>();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: {
            defaultView: {
              localStorage: storage,
            },
            // Angular's internal SharedStylesHost touches documentElement during
            // DI bootstrap. Provide both nodes; the service writes to body so we
            // assert against body's style map.
            documentElement: createStyledElement(new Map<string, string>()),
            body: createStyledElement(style),
          },
        },
        {
          provide: PLATFORM_ID,
          useValue: 'browser',
        },
      ],
    });
  });

  // Test que valida el estado inicial del acento y la conversión hexadecimal a RGBA.
  it('exposes a default empty accent and normalizes hex via toRgba', () => {
    const service = TestBed.inject(BrandService);

    expect(service.accentColor()).toBeNull();
    expect(service.hasAccent()).toBe(false);

    expect(service.toRgba('#fff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
    expect(service.toRgba('#1d9bf0', 0.32)).toBe('rgba(29, 155, 240, 0.32)');
  });

  // Test que valida que un color inválido se devuelva sin transformaciones.
  it('returns the original value when hex cannot be parsed', () => {
    const service = TestBed.inject(BrandService);

    expect(service.toRgba('not-a-color', 0.4)).toBe('not-a-color');
  });

  // Test que valida la aplicación y persistencia de variables CSS al definir un acento.
  it('applies CSS custom properties and persists when an accent is set', () => {
    const service = TestBed.inject(BrandService);

    service.setAccent('#ef4444');
    TestBed.flushEffects();

    expect(service.accentColor()).toBe('#ef4444');
    expect(service.hasAccent()).toBe(true);
    expect(style.get('--accent-color')).toBe('#ef4444');
    expect(style.get('--border-color')).toBe('rgba(239, 68, 68, 0.32)');
    expect(style.get('--border-strong')).toBe('rgba(239, 68, 68, 0.6)');
    expect(storage.getItem(STORAGE_KEY)).toBe('#ef4444');
  });

  // Test que valida el rechazo de hexadecimales malformados sin cambiar el estado.
  it('rejects malformed hex values without changing state', () => {
    const service = TestBed.inject(BrandService);

    service.setAccent('#abcd');
    TestBed.flushEffects();

    expect(service.accentColor()).toBeNull();
    expect(style.has('--accent-color')).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  // Test que valida la limpieza de estilos y almacenamiento al resetear el acento.
  it('clears the overrides and storage on reset', () => {
    const service = TestBed.inject(BrandService);

    service.setAccent('#22c55e');
    TestBed.flushEffects();

    service.reset();
    TestBed.flushEffects();

    expect(service.accentColor()).toBeNull();
    expect(style.has('--accent-color')).toBe(false);
    expect(style.has('--border-color')).toBe(false);
    expect(style.has('--border-strong')).toBe(false);
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  // Test que valida la hidratación del acento desde localStorage al construir el servicio.
  it('hydrates the accent from storage on construction', () => {
    storage.setItem(STORAGE_KEY, '#3b82f6');

    const service = TestBed.inject(BrandService);
    TestBed.flushEffects();

    expect(service.accentColor()).toBe('#3b82f6');
    expect(style.get('--border-color')).toBe('rgba(59, 130, 246, 0.32)');
  });
});

function createStorage(): Storage {
  const values = new Map<string, string>();

  return {
    length: 0,
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  } as Storage;
}

function createStyledElement(store: Map<string, string>): unknown {
  return {
    style: {
      setProperty: (key: string, value: string) => store.set(key, value),
      removeProperty: (key: string) => {
        store.delete(key);
      },
      getPropertyValue: (key: string) => store.get(key) ?? '',
    },
    // Angular's TestBed bootstrap calls body.querySelector while wiring up
    // SharedStylesHost. Provide noop DOM stubs so DI does not crash.
    querySelector: () => null,
    querySelectorAll: () => [],
    appendChild: (node: unknown) => node,
    removeChild: (node: unknown) => node,
    contains: () => false,
    classList: {
      add: () => undefined,
      remove: () => undefined,
      toggle: () => false,
      contains: () => false,
    },
  };
}
