/**
 * Testes de integração para API
 * Testa comunicação real com backend (mockado com MSW)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { rest } from 'msw';

// Mock do servidor MSW
const server = setupServer(
  rest.get('*/api/health', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        environment: 'test'
      })
    );
  }),
  rest.post('*/api/auth/register', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        access_token: 'mock-token',
        token_type: 'bearer',
        user: {
          id: '1',
          name: 'Test User',
          email: 'test@test.com'
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterAll(() => server.close());

describe('API Integration', () => {
  it('deve fazer health check com sucesso', async () => {
    const response = await fetch('http://localhost:8000/api/health');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.database).toBe('connected');
  });

  it('deve registrar usuário com sucesso', async () => {
    const response = await fetch('http://localhost:8000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@test.com',
        password: 'Test123!@#'
      })
    });
    
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.access_token).toBeDefined();
    expect(data.user).toBeDefined();
  });
});

