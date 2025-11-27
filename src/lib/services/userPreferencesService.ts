/**
 * SERVIÇO DE PREFERÊNCIAS DO USUÁRIO
 * Gerencia preferências personalizadas de cada usuário por tenant
 * Persistência híbrida: SessionStorage (curto prazo) + Database (longo prazo)
 */

import { devLog } from '@/lib/utils/productionLogger';

export interface UserPreference {
  id?: string;
  user_id: string;
  tenant_id: string;
  preference_key: string;
  preference_value: any;
  created_at?: string;
  updated_at?: string;
}

export interface ProjectFiltersPreference {
  filterType: 'todos' | 'meus' | 'sem-responsavel';
  selectedResponsible?: string;
  sortBy: 'manual' | 'sla' | 'data' | 'prioridade';
  viewMode?: 'kanban' | 'tabela';
}

class UserPreferencesService {
  private readonly STORAGE_PREFIX = 'sgf_pref_';
  private readonly API_BASE = '/api/user/preferences';

  /**
   * Salvar preferência (híbrido: SessionStorage + API)
   */
  async savePreference(
    preferenceKey: string,
    preferenceValue: any,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    try {
      // 1. Salvar em SessionStorage para acesso rápido
      this.saveToSessionStorage(preferenceKey, preferenceValue);

      // 2. Salvar no banco de dados para persistência
      if (userId && tenantId) {
        await this.saveToDatabase(preferenceKey, preferenceValue, userId, tenantId);
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao salvar preferência:', error);
      throw error;
    }
  }

  /**
   * Buscar preferência (híbrido: SessionStorage primeiro, depois API)
   */
  async getPreference<T = any>(
    preferenceKey: string,
    userId?: string,
    tenantId?: string
  ): Promise<T | null> {
    try {
      // 1. Tentar buscar do SessionStorage (mais rápido)
      const sessionValue = this.getFromSessionStorage<T>(preferenceKey);
      if (sessionValue !== null) {
        devLog.log('[UserPreferencesService] Preferência encontrada em SessionStorage');
        return sessionValue;
      }

      // 2. Buscar do banco de dados
      if (userId && tenantId) {
        const dbValue = await this.getFromDatabase<T>(preferenceKey, userId, tenantId);
        if (dbValue !== null) {
          // Sincronizar com SessionStorage
          this.saveToSessionStorage(preferenceKey, dbValue);
          devLog.log('[UserPreferencesService] Preferência encontrada no banco de dados');
          return dbValue;
        }
      }

      return null;
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao buscar preferência:', error);
      return null;
    }
  }

  /**
   * Deletar preferência
   */
  async deletePreference(
    preferenceKey: string,
    userId?: string,
    tenantId?: string
  ): Promise<void> {
    try {
      // 1. Remover do SessionStorage
      this.removeFromSessionStorage(preferenceKey);

      // 2. Remover do banco de dados
      if (userId && tenantId) {
        await this.deleteFromDatabase(preferenceKey, userId, tenantId);
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao deletar preferência:', error);
      throw error;
    }
  }

  /**
   * Limpar todas as preferências (útil para logout)
   */
  clearAllPreferences(): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const keys = Object.keys(sessionStorage);
        keys.forEach(key => {
          if (key.startsWith(this.STORAGE_PREFIX)) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao limpar preferências:', error);
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS - SessionStorage
  // ============================================

  private saveToSessionStorage(key: string, value: any): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const storageKey = `${this.STORAGE_PREFIX}${key}`;
        sessionStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao salvar em SessionStorage:', error);
    }
  }

  private getFromSessionStorage<T = any>(key: string): T | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const storageKey = `${this.STORAGE_PREFIX}${key}`;
        const item = sessionStorage.getItem(storageKey);
        return item ? JSON.parse(item) : null;
      }
      return null;
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao ler de SessionStorage:', error);
      return null;
    }
  }

  private removeFromSessionStorage(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const storageKey = `${this.STORAGE_PREFIX}${key}`;
        sessionStorage.removeItem(storageKey);
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao remover de SessionStorage:', error);
    }
  }

  // ============================================
  // MÉTODOS PRIVADOS - Database (via API)
  // ============================================

  private async saveToDatabase(
    preferenceKey: string,
    preferenceValue: any,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const response = await fetch(this.API_BASE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({
          user_id: userId,
          tenant_id: tenantId,
          preference_key: preferenceKey,
          preference_value: preferenceValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar preferência');
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao salvar no banco:', error);
      // Não lançar erro - preferências não são críticas
    }
  }

  private async getFromDatabase<T = any>(
    preferenceKey: string,
    userId: string,
    tenantId: string
  ): Promise<T | null> {
    try {
      const response = await fetch(
        `${this.API_BASE}?user_id=${userId}&tenant_id=${tenantId}&preference_key=${preferenceKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.data) {
        return result.data.preference_value as T;
      }

      return null;
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao buscar do banco:', error);
      return null;
    }
  }

  private async deleteFromDatabase(
    preferenceKey: string,
    userId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.API_BASE}?user_id=${userId}&tenant_id=${tenantId}&preference_key=${preferenceKey}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenantId,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      devLog.error('[UserPreferencesService] Erro ao deletar do banco:', error);
      // Não lançar erro - preferências não são críticas
    }
  }
}

// Singleton
export const userPreferencesService = new UserPreferencesService();

// Funções de conveniência para preferências específicas
export const saveProjectFilters = (
  filters: ProjectFiltersPreference,
  userId?: string,
  tenantId?: string
) => userPreferencesService.savePreference('projetos_filtros', filters, userId, tenantId);

export const getProjectFilters = (userId?: string, tenantId?: string) =>
  userPreferencesService.getPreference<ProjectFiltersPreference>('projetos_filtros', userId, tenantId);

export const resetProjectFilters = (userId?: string, tenantId?: string) =>
  userPreferencesService.deletePreference('projetos_filtros', userId, tenantId);
