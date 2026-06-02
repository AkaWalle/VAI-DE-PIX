/**
 * Sanidade do monorepo VAI DE PIX — estrutura mínima e scripts npm.
 * Executar: npx vitest run tests/basic.spec.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function readJson<T>(relativePath: string): T {
  const full = resolve(root, relativePath);
  expect(existsSync(full), `arquivo ausente: ${relativePath}`).toBe(true);
  return JSON.parse(readFileSync(full, 'utf-8')) as T;
}

describe('Sanidade do projeto', () => {
  it('package.json define o nome e scripts essenciais', () => {
    const pkg = readJson<{ name: string; scripts: Record<string, string> }>(
      'package.json',
    );
    expect(pkg.name).toBe('vai-de-pix');
    expect(pkg.scripts['type-check']).toBeDefined();
    expect(pkg.scripts['test']).toBeDefined();
    expect(pkg.scripts['build']).toBeDefined();
  });

  it('pastas principais do frontend existem', () => {
    for (const dir of ['src', 'src/pages', 'src/stores', 'src/lib']) {
      expect(existsSync(resolve(root, dir)), `pasta ausente: ${dir}`).toBe(
        true,
      );
    }
  });

  it('backend FastAPI e testes Python existem', () => {
    for (const path of [
      'backend/main.py',
      'backend/core/ledger_utils.py',
      'backend/tests',
    ]) {
      expect(existsSync(resolve(root, path)), `ausente: ${path}`).toBe(true);
    }
  });

  it('documentação SDD e CLAUDE na raiz existem', () => {
    expect(existsSync(resolve(root, 'CLAUDE.md'))).toBe(true);
    expect(existsSync(resolve(root, 'docs/PRD.md'))).toBe(true);
  });

  describe('getApiUrl (smoke)', () => {
    beforeEach(() => {
      vi.stubGlobal('localStorage', {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0,
      });
    });

    it('usa VITE_API_URL em produção quando configurada', async () => {
      vi.stubEnv('VITE_API_URL', 'http://127.0.0.1:8000/api');
      vi.stubEnv('PROD', 'true');
      const { getApiUrl } = await import('@/lib/api-detector');
      expect(getApiUrl()).toBe('http://127.0.0.1:8000/api');
    });
  });
});
