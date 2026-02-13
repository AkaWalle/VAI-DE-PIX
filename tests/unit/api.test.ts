/**
 * Testes unitários para configuração da API
 * Garante que VITE_API_URL está configurada corretamente
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getApiUrl } from '@/lib/api-detector';

describe('API Configuration', () => {
  beforeEach(() => {
    // Limpar localStorage antes de cada teste
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('deve usar VITE_API_URL em produção quando configurada', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.vai-de-pix.com/api');
    vi.stubEnv('PROD', 'true');
    
    const apiUrl = getApiUrl();
    expect(apiUrl).toBe('https://api.vai-de-pix.com/api');
  });

  it('deve usar localStorage se disponível', () => {
    localStorage.setItem('vai-de-pix-api-url', 'https://custom-api.com/api');
    const apiUrl = getApiUrl();
    expect(apiUrl).toBe('https://custom-api.com/api');
  });

  it('deve usar proxy em desenvolvimento quando não há URL customizada', () => {
    vi.stubEnv('DEV', 'true');
    vi.stubEnv('VITE_API_URL', '');
    
    const apiUrl = getApiUrl();
    expect(apiUrl).toBe('/api');
  });
});

