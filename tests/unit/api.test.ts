/**
 * Testes unitários para configuração da API
 * Garante que getApiUrl reflete a lógica de api-detector.ts
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiUrl } from '@/lib/api-detector';

describe('API Configuration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('deve usar /api em produção fora de localhost (mesma origem)', () => {
    vi.stubEnv('PROD', true);
    vi.stubGlobal('location', {
      hostname: 'vai-de-pix.vercel.app',
      port: '',
      protocol: 'https:',
    } as Location);

    expect(getApiUrl()).toBe('/api');
  });

  it('deve usar localStorage se disponível em desenvolvimento', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    localStorage.setItem('vai-de-pix-api-url', 'https://custom-api.com/api');

    expect(getApiUrl()).toBe('https://custom-api.com/api');
  });

  it('deve usar VITE_API_URL quando definida em desenvolvimento', () => {
    vi.stubEnv('PROD', false);
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_API_URL', 'http://localhost:8000/api');

    expect(getApiUrl()).toBe('http://localhost:8000/api');
  });
});
