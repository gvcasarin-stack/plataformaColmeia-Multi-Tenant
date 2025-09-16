/**
 * Cliente API com Silent Refresh e Retry Logic
 * Padrão usado por SaaS comerciais para evitar problemas de sessão entre abas
 */

import { devLog } from '@/lib/utils/productionLogger';

interface ApiClientOptions {
  headers?: HeadersInit;
  retryOnAuth?: boolean;
}

class ApiClient {
  private static instance: ApiClient;

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Tentar renovar sessão silenciosamente
   */
  private async silentRefresh(): Promise<boolean> {
    try {
      devLog.log('[API Client] Tentando silent refresh...');

      const authToken = this.getAuthToken();
      if (!authToken) {
        devLog.warn('[API Client] Sem token para refresh');
        return false;
      }

      const response = await fetch('/api/auth/silent-refresh', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Atualizar token no storage local (simulado)
        this.updateAuthToken(result.access_token);
        devLog.log('[API Client] Silent refresh bem-sucedido');
        return true;
      } else {
        devLog.warn('[API Client] Silent refresh falhou:', result.error);
        return false;
      }

    } catch (error) {
      devLog.error('[API Client] Erro no silent refresh:', error);
      return false;
    }
  }

  /**
   * Obter token de autorização (adaptado para sua implementação)
   */
  private getAuthToken(): string | null {
    // ADAPTAR: Implementar baseado em como vocês armazenam o token
    // Pode ser localStorage, cookie, context, etc.
    if (typeof window !== 'undefined') {
      return localStorage.getItem('supabase.auth.token') ||
             sessionStorage.getItem('auth_token') ||
             null;
    }
    return null;
  }

  /**
   * Atualizar token após refresh
   */
  private updateAuthToken(newToken: string): void {
    // ADAPTAR: Implementar baseado em como vocês armazenam o token
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase.auth.token', newToken);
      // Também pode precisar atualizar context/state
    }
  }

  /**
   * Obter headers atualizados com token
   */
  private async getUpdatedHeaders(customHeaders?: HeadersInit): Promise<HeadersInit> {
    const token = this.getAuthToken();

    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...customHeaders,
    };
  }

  /**
   * Fazer chamada API com retry automático em caso de 401
   */
  async fetchWithRetry(url: string, options: RequestInit & ApiClientOptions = {}): Promise<Response> {
    const { retryOnAuth = true, ...fetchOptions } = options;

    // Primeira tentativa
    let headers = await this.getUpdatedHeaders(fetchOptions.headers);
    let response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    // Se 401 e retry habilitado, tentar silent refresh + retry
    if (response.status === 401 && retryOnAuth) {
      devLog.log('[API Client] 401 detectado, tentando silent refresh...');

      const refreshSuccess = await this.silentRefresh();

      if (refreshSuccess) {
        devLog.log('[API Client] Retry após silent refresh...');

        // Retry com token atualizado
        headers = await this.getUpdatedHeaders(fetchOptions.headers);
        response = await fetch(url, {
          ...fetchOptions,
          headers,
        });

        if (response.ok) {
          devLog.log('[API Client] Retry bem-sucedido');
        } else {
          devLog.warn('[API Client] Retry falhou:', response.status);
        }
      } else {
        devLog.error('[API Client] Silent refresh falhou, mantendo resposta 401');
      }
    }

    return response;
  }

  /**
   * POST com retry automático
   */
  async post(url: string, data?: any, options: ApiClientOptions = {}): Promise<Response> {
    return this.fetchWithRetry(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * GET com retry automático
   */
  async get(url: string, options: ApiClientOptions = {}): Promise<Response> {
    return this.fetchWithRetry(url, {
      method: 'GET',
      ...options,
    });
  }
}

// Exportar instância singleton
export const apiClient = ApiClient.getInstance();