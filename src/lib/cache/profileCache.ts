// 🚀 Sistema de Cache Robusto para Perfis
// ✅ SIMPLIFICADO: Cache conservador sem verificações complexas

import { devLog } from "@/lib/utils/productionLogger";
import { UserProfile } from '@/lib/contexts/AuthContext';

// ✅ CONSERVADOR: TTLs muito mais longos
const MEMORY_CACHE_EXPIRY = 1000 * 60 * 60; // 1 hora - cache em memória
const SESSION_CACHE_EXPIRY = 1000 * 60 * 60 * 6; // 6 horas - sessionStorage
const LOCAL_CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 horas - localStorage
const CACHE_VERSION = '1.0';

// Interfaces para dados de cache
interface CachedProfile {
  profile: UserProfile;
  timestamp: number;
  version: string;
  expiresAt: number;
  source: 'database' | 'session' | 'fallback';
}

// ✅ CORREÇÃO: Interface de estatísticas atualizada
interface CacheStats {
  hits: number;
  misses: number;
  requests: number;
  memoryHits: number;
  sessionHits: number;
  localHits: number;
  errors: number;
  lastCleanup: number;
}

/**
 * 🚀 Sistema de Cache Multi-Camada SIMPLIFICADO
 * 
 * Prioridade de cache:
 * 1. Memória (1h)
 * 2. SessionStorage (6h) 
 * 3. LocalStorage (24h)
 * 
 * ✅ REMOVIDO: Verificações de atividade, extensões complexas
 */
class ProfileCache {
  private static instance: ProfileCache;
  private memoryCache = new Map<string, CachedProfile>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    requests: 0,
    memoryHits: 0,
    sessionHits: 0, 
    localHits: 0,
    errors: 0,
    lastCleanup: 0
  };

  private constructor() {
    // Limpeza periódica mais espaçada (a cada 30 minutos)
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupMemoryCache(), 30 * 60 * 1000);
    }
  }

  static getInstance(): ProfileCache {
    if (!ProfileCache.instance) {
      ProfileCache.instance = new ProfileCache();
    }
    return ProfileCache.instance;
  }

  /**
   * 🔍 Buscar perfil no cache (com extensão para usuários ativos)
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!userId) return null;

    this.stats.requests++;

    try {
      // Verificar camadas em ordem: memória → sessão → local
      let cached = this.getFromMemory(userId);
      let source = 'memory';

      if (!cached) {
        cached = this.getFromSession(userId);
        source = 'session';
        
        // Promover para memória se encontrado na sessão
        if (cached) {
          this.memoryCache.set(userId, cached);
          devLog.log(`[ProfileCache] ⬆️ Promovido de sessão para memória: ${userId}`);
        }
      }

      if (!cached) {
        cached = this.getFromLocal(userId);
        source = 'local';
        
        // Promover para camadas superiores se encontrado no local
        if (cached) {
          this.memoryCache.set(userId, cached);
          this.setInSession(userId, cached);
          devLog.log(`[ProfileCache] ⬆️ Promovido de local para todas as camadas: ${userId}`);
        }
      }

      if (cached) {
        this.stats.hits++;
        devLog.log(`[ProfileCache] ✅ Cache hit (${source}) para usuário: ${userId}`);
        return cached.profile;
      }

      this.stats.misses++;
      devLog.log(`[ProfileCache] ❌ Cache miss para usuário: ${userId}`);
      return null;

    } catch (error) {
      this.stats.errors++;
      devLog.error('[ProfileCache] ❌ Erro ao buscar no cache:', error);
      return null;
    }
  }

  /**
   * 💾 Salvar perfil no cache (todas as camadas)
   */
  setProfile(userId: string, profile: UserProfile, source: 'database' | 'session' | 'fallback' = 'database'): void {
    if (!userId || !profile) return;

    try {
      const cachedProfile: CachedProfile = {
        profile,
        timestamp: Date.now(),
        version: CACHE_VERSION,
        expiresAt: Date.now() + (source === 'database' ? LOCAL_CACHE_EXPIRY : SESSION_CACHE_EXPIRY),
        source
      };

      // Salvar em todas as camadas
      this.setInMemory(userId, cachedProfile);
      this.setInSession(userId, cachedProfile);
      
      // LocalStorage apenas para dados do banco e admins
      if (source === 'database' && (profile.role === 'admin' || profile.role === 'superadmin')) {
        this.setInLocal(userId, cachedProfile);
      }

      devLog.log(`[ProfileCache] ✅ Perfil cacheado para ${profile.email} (source: ${source})`);

    } catch (error) {
      this.stats.errors++;
      devLog.error('[ProfileCache] ❌ Erro ao salvar no cache:', error);
    }
  }

  /**
   * 🧹 Limpar cache específico do usuário
   */
  clearProfile(userId: string): void {
    if (!userId) return;

    try {
      // Limpar memória
      this.memoryCache.delete(userId);

      // Limpar sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(`profile_cache_${userId}`);
        localStorage.removeItem(`profile_cache_${userId}`);
      }

      devLog.log(`[ProfileCache] 🧹 Cache limpo para usuário: ${userId}`);
    } catch (error) {
      devLog.error('[ProfileCache] ❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * 🧹 Limpar todo o cache
   */
  clearAll(): void {
    try {
      // Limpar memória
      this.memoryCache.clear();

      // Limpar storage
      if (typeof window !== 'undefined') {
        const keys = Object.keys(sessionStorage).filter(key => key.startsWith('profile_cache_'));
        keys.forEach(key => {
          sessionStorage.removeItem(key);
        });

        const localKeys = Object.keys(localStorage).filter(key => key.startsWith('profile_cache_'));
        localKeys.forEach(key => {
          localStorage.removeItem(key);
        });
      }

      devLog.log('[ProfileCache] 🧹 Todo cache limpo');
    } catch (error) {
      devLog.error('[ProfileCache] ❌ Erro ao limpar todo cache:', error);
    }
  }

  /**
   * 📊 Obter estatísticas do cache
   */
  getStats(): CacheStats & { memorySize: number } {
    return {
      ...this.stats,
      memorySize: this.memoryCache.size
    };
  }

  // === MÉTODOS PRIVADOS ===

  private getFromMemory(userId: string): CachedProfile | null {
    const cached = this.memoryCache.get(userId);
    if (!cached) return null;

    if (this.isExpired(cached, MEMORY_CACHE_EXPIRY)) {
      this.memoryCache.delete(userId);
      return null;
    }

    return cached;
  }

  private getFromSession(userId: string): CachedProfile | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = sessionStorage.getItem(`profile_cache_${userId}`);
      if (!cached) return null;

      const parsed: CachedProfile = JSON.parse(cached);
      
      if (this.isExpired(parsed, SESSION_CACHE_EXPIRY) || parsed.version !== CACHE_VERSION) {
        sessionStorage.removeItem(`profile_cache_${userId}`);
        return null;
      }

      return parsed;
    } catch (error) {
      devLog.error('[ProfileCache] ❌ Erro ao ler sessionStorage:', error);
      return null;
    }
  }

  private getFromLocal(userId: string): CachedProfile | null {
    if (typeof window === 'undefined') return null;

    try {
      const cached = localStorage.getItem(`profile_cache_${userId}`);
      if (!cached) return null;

      const parsed: CachedProfile = JSON.parse(cached);
      
      if (this.isExpired(parsed, LOCAL_CACHE_EXPIRY) || parsed.version !== CACHE_VERSION) {
        localStorage.removeItem(`profile_cache_${userId}`);
        return null;
      }

      return parsed;
    } catch (error) {
      devLog.error('[ProfileCache] ❌ Erro ao ler localStorage:', error);
      return null;
    }
  }

  private setInMemory(userId: string, cached: CachedProfile): void {
    this.memoryCache.set(userId, cached);
  }

  private setInSession(userId: string, cached: CachedProfile): void {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(`profile_cache_${userId}`, JSON.stringify(cached));
    } catch (error) {
      devLog.error('[ProfileCache] ❌ Erro ao salvar sessionStorage:', error);
    }
  }

  private setInLocal(userId: string, cached: CachedProfile): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(`profile_cache_${userId}`, JSON.stringify(cached));
    } catch (error) {
      devLog.error('[ProfileCache] ❌ Erro ao salvar localStorage:', error);
    }
  }

  private isExpired(cached: CachedProfile, maxAge: number): boolean {
    return Date.now() - cached.timestamp > maxAge;
  }

  private cleanupMemoryCache(): void {
    const now = Date.now();
    let cleaned = 0;

    // Converter para array para evitar problemas de iteração
    const entries = Array.from(this.memoryCache.entries());
    for (const [userId, cached] of entries) {
      if (now - cached.timestamp > MEMORY_CACHE_EXPIRY) {
        this.memoryCache.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      devLog.log(`[ProfileCache] 🧹 Limpeza automática: ${cleaned} entradas removidas`);
    }
  }

  private logCacheHit(source: 'memory' | 'session' | 'local', userId: string): void {
    devLog.log(`[ProfileCache] ✅ Cache hit (${source}) para usuário: ${userId}`);
  }
}

// Exportar instância singleton
export const profileCache = ProfileCache.getInstance();

// Exportar interface para uso em tipos
export type { CachedProfile, CacheStats };
