/**
 * Logger específico para processo de registro
 * Funciona em PRODUÇÃO para debugging crítico
 */

export interface RegistrationLogEntry {
  timestamp: string;
  step: string;
  message: string;
  data?: any;
  error?: any;
}

export const registrationLogger = {
  /**
   * Log normal - sempre ativo para debugging crítico
   */
  log: (step: string, message: string, data?: any) => {
    const logEntry: RegistrationLogEntry = {
      timestamp: new Date().toISOString(),
      step,
      message,
      data
    };

    // Log no console (sempre ativo para debugging)
    console.log(`[REGISTRATION-${step}] ${message}`, data || '');
    
    // Log também no console.info para garantir que apareça na Vercel
    console.info(`[REG-${step}]`, message, data);

    // Salvar no localStorage para análise posterior
    if (typeof window !== 'undefined') {
      try {
        const logs = JSON.parse(localStorage.getItem('registration_logs') || '[]');
        logs.push(logEntry);
        // Manter apenas os últimos 50 logs
        const recentLogs = logs.slice(-50);
        localStorage.setItem('registration_logs', JSON.stringify(recentLogs));
      } catch (e) {
        console.warn('[REGISTRATION] Erro ao salvar log no localStorage:', e);
      }
      
      // Enviar log crítico para API (apenas em produção)
      if (step === 'SQL_FUNCTION' || step === 'ERROR' || step === 'SUCCESS') {
        try {
          fetch('/api/logs/registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
          }).catch(() => {
            // Silenciar erro de API para não afetar o registro
          });
        } catch (e) {
          // Silenciar erro
        }
      }
    }
  },

  /**
   * Log de erro - sempre ativo e crítico
   */
  error: (step: string, message: string, error?: any) => {
    const logEntry: RegistrationLogEntry = {
      timestamp: new Date().toISOString(),
      step,
      message,
      error: {
        message: error?.message || error,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack,
        full_error: error
      }
    };

    // Log de erro no console (sempre ativo)
    console.error(`[REGISTRATION-ERROR-${step}] ${message}`, error);
    
    // Log também no console.warn para garantir que apareça na Vercel
    console.warn(`[REG-ERROR-${step}]`, message, error);

    // Salvar erros no localStorage
    if (typeof window !== 'undefined') {
      try {
        const errors = JSON.parse(localStorage.getItem('registration_errors') || '[]');
        errors.push(logEntry);
        // Manter apenas os últimos 20 erros
        const recentErrors = errors.slice(-20);
        localStorage.setItem('registration_errors', JSON.stringify(recentErrors));
      } catch (e) {
        console.warn('[REGISTRATION] Erro ao salvar erro no localStorage:', e);
      }
      
      // Enviar erro crítico para API
      try {
        fetch('/api/logs/registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...logEntry, type: 'error' })
        }).catch(() => {
          // Silenciar erro de API para não afetar o registro
        });
      } catch (e) {
        // Silenciar erro
      }
    }
  },

  /**
   * Função para recuperar logs salvos (para debugging)
   */
  getLogs: () => {
    if (typeof window !== 'undefined') {
      try {
        return {
          logs: JSON.parse(localStorage.getItem('registration_logs') || '[]'),
          errors: JSON.parse(localStorage.getItem('registration_errors') || '[]')
        };
      } catch (e) {
        console.warn('[REGISTRATION] Erro ao recuperar logs:', e);
        return { logs: [], errors: [] };
      }
    }
    return { logs: [], errors: [] };
  },

  /**
   * Limpar logs salvos
   */
  clearLogs: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('registration_logs');
      localStorage.removeItem('registration_errors');
      console.log('[REGISTRATION] Logs limpos');
    }
  }
};

// Função global para acessar logs via console do navegador
if (typeof window !== 'undefined') {
  (window as any).getRegistrationLogs = registrationLogger.getLogs;
  (window as any).clearRegistrationLogs = registrationLogger.clearLogs;
}
