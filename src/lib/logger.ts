/**
 * Sistema de logging centralizado para o frontend.
 * 
 * Em produção, console.log é silenciado e erros são enviados para monitoramento.
 * Em desenvolvimento, todos os logs são exibidos no console com cores.
 * 
 * Uso:
 *   import { logger } from '@/lib/logger';
 *   
 *   logger.debug('Debug info', { userId: 123 });
 *   logger.info('User logged in', { userId: user.id });
 *   logger.warn('Rate limit approaching', { remaining: 5 });
 *   logger.error('Payment failed', { orderId: order.id, error: err });
 */

const IS_DEV = import.meta.env.DEV;
const IS_PROD = import.meta.env.PROD;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  /**
   * Log de debug (apenas em desenvolvimento).
   * Use para informações técnicas detalhadas.
   */
  debug(message: string, context?: LogContext): void {
    if (IS_DEV) {
      console.log(`🔍 [DEBUG]`, message, context || '');
    }
  }

  /**
   * Log de informação (apenas em desenvolvimento).
   * Use para eventos normais da aplicação.
   */
  info(message: string, context?: LogContext): void {
    if (IS_DEV) {
      console.info(`ℹ️ [INFO]`, message, context || '');
    }
  }

  /**
   * Log de aviso (sempre exibido).
   * Use para situações anômalas mas não críticas.
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`⚠️ [WARN]`, message, context || '');
    
    if (IS_PROD) {
      this.sendToMonitoring('warning', message, context);
    }
  }

  /**
   * Log de erro (sempre exibido).
   * Use para erros que impedem funcionalidade.
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    console.error(`❌ [ERROR]`, message, error, context || '');
    
    if (IS_PROD) {
      this.sendToMonitoring('error', message, {
        ...context,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : String(error),
      });
    }
  }

  /**
   * Envia logs para serviço de monitoramento (Sentry).
   * Apenas em produção e apenas warn/error.
   */
  private sendToMonitoring(level: LogLevel, message: string, context?: LogContext): void {
    // Sentry integration - apenas se estiver configurado
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      const Sentry = (window as any).Sentry;
      
      if (level === 'error') {
        // Se context.error é um Error, capturar como exception
        if (context?.error && context.error instanceof Error) {
          Sentry.captureException(context.error, {
            level: 'error' as any,
            extra: {
              message,
              ...context,
            },
          });
        } else {
          // Senão, capturar como message
          Sentry.captureMessage(message, {
            level: 'error' as any,
            extra: context,
          });
        }
      } else if (level === 'warning') {
        Sentry.captureMessage(message, {
          level: 'warning' as any,
          extra: context,
        });
      }
    }
    
    // Log em dev (para debug)
    if (IS_DEV && level !== 'debug') {
      console.log(`📊 [MONITORING] Sent to Sentry:`, { level, message, context });
    }
  }

  /**
   * Helper para medir performance de operações.
   * Retorna uma função para marcar o fim da operação.
   * 
   * Uso:
   *   const end = logger.time('fetch-users');
   *   const users = await fetchUsers();
   *   end(); // Loga: "fetch-users completed in 234ms"
   */
  time(label: string): () => void {
    const start = performance.now();
    
    return () => {
      const duration = Math.round(performance.now() - start);
      this.debug(`${label} completed in ${duration}ms`, { duration });
    };
  }

  /**
   * Helper para logar chamadas de API.
   * 
   * Uso:
   *   logger.api('GET', '/api/users', 200, 234);
   */
  api(method: string, url: string, status: number, duration: number): void {
    const emoji = status >= 500 ? '❌' : status >= 400 ? '⚠️' : '✅';
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug';
    
    const message = `${method} ${url} - ${status} (${duration}ms)`;
    const context = { method, url, status, duration };
    
    if (level === 'error') {
      this.error(`${emoji} API Error: ${message}`, undefined, context);
    } else if (level === 'warn') {
      this.warn(`${emoji} API Warning: ${message}`, context);
    } else {
      this.debug(`${emoji} API: ${message}`, context);
    }
  }

  /**
   * Helper para logar mudanças de estado (Zustand, Redux, etc).
   * 
   * Uso:
   *   logger.state('authStore', 'login', { before: null, after: { user: {...} } });
   */
  state(store: string, action: string, data?: LogContext): void {
    if (IS_DEV) {
      console.log(
        `🔄 [STATE] ${store}.${action}`,
        data || ''
      );
    }
  }
}

// Singleton logger instance
export const logger = new Logger();

// Re-exportar para uso direto
export default logger;
