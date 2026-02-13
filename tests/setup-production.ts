/**
 * Setup para testes de produção (API)
 * Não precisa de mocks do React/DOM
 */

// Configurar variáveis de ambiente se necessário
if (!process.env.PRODUCTION_API_URL) {
  // Tentar detectar da documentação
  process.env.PRODUCTION_API_URL = 'https://vai-de-ewqbjdazj-akawalles-projects.vercel.app';
}

