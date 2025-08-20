"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { type User as SupabaseUser, type Session, type AuthError, SignInWithPasswordCredentials, SignUpWithPasswordCredentials, SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
// ✅ PHASE 1: Importar novos sistemas de cache, recovery e logging
import { profileCache } from '@/lib/cache/profileCache';
import { fetchUserProfileWithRecovery } from '@/lib/recovery/errorRecovery';
import { devLog } from "@/lib/utils/productionLogger";
import { logger } from '@/lib/utils/logger';
// ✅ SUPABASE - Imports otimizados (sessão gerenciada pelo InactivityContext)

// ✅ PHASE 1: Performance tracking aprimorado com logging estruturado
const measurePerformance = async <T,>(label: string, action: () => Promise<T>): Promise<T> => {
  const start = performance.now();
  try {
    const result = await action();
    const duration = performance.now() - start;
    logger.performance.timing(label, duration, { success: true });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.performance.timing(label, duration, { success: false, error: error.message });
    throw error;
  }
};

// Token expiration constants
const TOKEN_EXPIRY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const TOKEN_EXPIRY_THRESHOLD = 10 * 60 * 1000; // 10 minutes before expiry
const SESSION_MAX_INACTIVITY = 20 * 60 * 1000; // 20 minutes of inactivity

// ✅ PHASE 1: Constantes simplificadas - cache agora gerenciado pela classe ProfileCache
const LAST_ACTIVITY_KEY = 'last_activity_timestamp';

// Activity management functions
const updateLastActivity = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
  } catch (error) {
    logger.error('Error updating last activity timestamp', { error: error.message }, 'Auth');
  }
};

const getLastActivity = (): number => {
  if (typeof window === 'undefined') return Date.now();
  
  try {
    const timestamp = localStorage.getItem(LAST_ACTIVITY_KEY);
    return timestamp ? parseInt(timestamp, 10) : Date.now();
  } catch (error) {
    logger.error('Error getting last activity timestamp', { error: error.message }, 'Auth');
    return Date.now();
  }
};

// Session timeout checker
const hasSessionTimedOut = (): boolean => {
  const lastActivity = getLastActivity();
  const now = Date.now();
  const inactiveTime = now - lastActivity;
  
  return inactiveTime > SESSION_MAX_INACTIVITY;
};

// Tipagem para os dados do usuário que queremos expor, incluindo o perfil da tabela public.users
export interface UserProfile {
  id: string;
  full_name?: string;
  email?: string;
  role?: 'cliente' | 'admin' | 'superadmin'; // Adicione outros papéis se necessário
  // Adicione outros campos do seu perfil aqui
}

export interface AuthUser extends SupabaseUser {
  profile?: UserProfile; // O perfil será opcional até ser carregado
}

// Estados de autenticação mais granulares
type AuthState = 
  | 'initializing'     // Verificando sessão inicial
  | 'loading-profile'  // Buscando dados do perfil
  | 'authenticated'    // Usuário logado com perfil
  | 'unauthenticated'  // Sem sessão
  | 'error'           // Erro na autenticação

// Tipagem para o valor do contexto
interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean; // Estado de carregamento combinado para sessão e perfil inicial
  authState: AuthState; // NOVO: Estado granular da autenticação
  error: AuthError | null;
  isAuthenticated: boolean; // ADICIONADO: propriedade para verificar se o usuário está autenticado
  signInWithPassword: (credentials: SignInWithPasswordCredentials) => Promise<{ error: AuthError | null; user: AuthUser | null; session: Session | null; }>;
  signUpWithPassword: (credentials: SignUpWithPasswordCredentials) => Promise<{ error: AuthError | null; user: AuthUser | null; session: Session | null; }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: AuthError | null }>;
  checkSession: () => Promise<boolean>; // ADICIONADO: função para verificar se a sessão é válida
  // fetchUserProfile não precisa ser exposto se for usado apenas internamente
}

// ✅ CORREÇÃO REACT #130: Funções não serializáveis para contexto inicial
const createInitialAuthFunctions = () => ({
  signInWithPassword: async () => ({ error: null, user: null, session: null }),
  signUpWithPassword: async () => ({ error: null, user: null, session: null }),
  signOut: async () => ({ error: null }),
  sendPasswordResetEmail: async () => ({ error: null }),
  checkSession: async () => false,
});

// Valor inicial para o contexto (sem funções diretamente no objeto)
const initialAuthContext: AuthContextType = {
  user: null,
  session: null,
  isLoading: true,
  authState: 'initializing',
  error: null,
  isAuthenticated: false,
  ...createInitialAuthFunctions(),
};

// Criação do Contexto
const AuthContext = createContext<AuthContextType>(initialAuthContext);

// Props para o AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Componente Provedor
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authState, setAuthState] = useState<AuthState>('initializing');
  const [error, setError] = useState<AuthError | null>(null);

  // DEBUG: Verificar se há sessões/tokens armazenados que podem causar login automático
  useEffect(() => {
    if (typeof window !== 'undefined') {
      devLog.log('[AuthContext] DEBUG - Verificando localStorage para sessões existentes:');
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => 
        key.includes('sb-') || 
        key.includes('supabase') || 
        key.includes('auth-token') ||
        key.includes('access-token') ||
        key.includes('refresh-token')
      );
      devLog.log('[AuthContext] DEBUG - Chaves relacionadas ao Supabase encontradas:', supabaseKeys);
      
      supabaseKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            devLog.log(`[AuthContext] DEBUG - ${key}:`, value.substring(0, 100) + (value.length > 100 ? '...' : ''));
          }
        } catch (e) {
          devLog.log(`[AuthContext] DEBUG - Erro ao ler ${key}:`, e);
        }
      });

      // Verificar sessionStorage também
      const sessionKeys = Object.keys(sessionStorage).filter(key => 
        key.includes('sb-') || 
        key.includes('supabase') || 
        key.includes('recovery')
      );
      devLog.log('[AuthContext] DEBUG - Chaves no sessionStorage:', sessionKeys);
    }
  }, []);

  // ✅ FUNÇÃO AUXILIAR: Busca de perfil com retry inteligente
  const fetchUserProfileWithRetry = useCallback(async (userId: string, maxRetries: number = 3): Promise<UserProfile | null> => {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(`Profile fetch attempt ${attempt}/${maxRetries}`, { userId }, 'Auth');
        const profile = await fetchUserProfileInternal(userId);
        
        if (profile) {
          logger.info(`Profile fetched successfully on attempt ${attempt}`, { userId, profile: { id: profile.id, role: profile.role } }, 'Auth');
          return profile;
        }
        
        // Se não encontrou o perfil, não vale a pena tentar novamente
        logger.warn(`Profile not found on attempt ${attempt}`, { userId }, 'Auth');
        return null;
        
      } catch (error: any) {
        lastError = error;
        logger.warn(`Profile fetch failed on attempt ${attempt}`, { 
          userId, 
          attempt, 
          maxRetries, 
          error: error.message 
        }, 'Auth');
        
        // Se não é o último attempt, aguardar antes de tentar novamente
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s...
          logger.debug(`Waiting ${delay}ms before retry`, { userId, attempt }, 'Auth');
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.error(`All profile fetch attempts failed`, { userId, maxRetries, lastError: lastError?.message }, 'Auth');
    return null;
  }, []);

  // ✅ PHASE 1: Nova busca ROBUSTA de perfil com cache multi-camada e error recovery
  const fetchUserProfileInternal = useCallback(async (userId: string, supabaseInstance: SupabaseClient = supabase): Promise<UserProfile | null> => {
    if (!userId) {
      logger.warn('Invalid userId provided to fetchUserProfileInternal', { userId }, 'Auth');
      return null;
    }

    logger.auth.profileFetch(userId, false, 'start', { action: 'fetch_start' });

    try {
      // 🚀 PHASE 1: Verificar cache multi-camada PRIMEIRO
      const cachedProfile = await profileCache.getProfile(userId);
      if (cachedProfile) {
        logger.auth.cacheHit(userId, 'multi-layer', { source: 'profileCache' });
        logger.auth.profileFetch(userId, true, 'cache', { cached: true });
        return cachedProfile;
      }

      logger.auth.cacheMiss(userId, { reason: 'no_cache_found' });

      // ✅ PHASE 1: Buscar no banco com error recovery
      const profile = await fetchUserProfileWithRecovery(
        // Operação principal: buscar do banco
        async () => {
          logger.debug('Fetching profile from database', { userId }, 'Auth');
          
          const { data, error } = await supabaseInstance
            .from('users')
            .select('id, full_name, email, role')
            .eq('id', userId)
            .single();

          if (error) {
            logger.error('Database query failed', { userId, error: error.message }, 'Auth');
            throw new Error(`Database error: ${error.message}`);
          }

          if (!data) {
            logger.warn('User profile not found in database', { userId }, 'Auth');
            throw new Error('Profile not found');
          }

          const userProfile = data as UserProfile;
          logger.auth.profileFetch(userId, true, 'database', { profile: userProfile });
          
          // ✅ PHASE 1: Cachear resultado do banco
          profileCache.setProfile(userId, userProfile, 'database');
          
          return userProfile;
        },
        // Fallback: criar perfil da sessão
        session?.user && session.user.id === userId ? {
          id: userId,
          email: session.user.email || '',
          full_name: session.user.user_metadata?.full_name || 
                    session.user.user_metadata?.name || 
                    session.user.email?.split('@')[0] || 'Usuário',
          role: session.user.user_metadata?.role || 'cliente'
        } : null,
        userId
      );

      if (profile) {
        // ✅ PHASE 1: Cachear resultado final (seja do banco ou fallback)
        const source = profile.full_name?.includes('@') ? 'session' : 'database';
        profileCache.setProfile(userId, profile, source);
        logger.auth.profileFetch(userId, true, source, { profile });
        return profile;
      }

      logger.auth.profileFetch(userId, false, 'failed', { reason: 'all_methods_failed' });
      return null;

    } catch (error: any) {
      logger.error('Critical error in fetchUserProfileInternal', 
        { userId, error: error.message }, 'Auth', error);
      logger.auth.profileFetch(userId, false, 'error', { error: error.message });
      return null;
    }
  }, [supabase, session]);

  useEffect(() => {
    let isMounted = true;

    async function getInitialSessionAndProfile() {
      logger.info('Verificando sessão inicial', {}, 'Auth');
      setAuthState('initializing');
      
      try {
        // Chamada direta para supabase.auth.getSession()
        logger.debug('Chamando supabase.auth.getSession() diretamente', {}, 'Auth');
        const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
        logger.debug('supabase.auth.getSession() concluído', {}, 'Auth');
        
        logger.info('Resultado da verificação de sessão inicial', {
          hasSession: !!currentSession,
          hasUser: !!currentSession?.user,
          sessionExpiresAt: currentSession?.expires_at,
          userEmail: currentSession?.user?.email,
          hasError: !!getSessionError
        }, 'Auth');
        
        if (!isMounted) return;

        if (getSessionError) {
          logger.error('Error getting initial session', { error: getSessionError.message }, 'Auth', getSessionError);
          setError(getSessionError);
          setUser(null);
          setSession(null);
          setAuthState('error');
          setIsLoading(false);
          return;
        }
        
        if (currentSession?.user) {
          logger.info('Sessão ativa encontrada, buscando perfil', { userId: currentSession.user.id }, 'Auth');
          setSession(currentSession);
          setAuthState('loading-profile');
          
          // ✅ CORREÇÃO CRÍTICA: Timeout para busca de perfil
          try {
            const profilePromise = (async () => {
              // Verificar cache primeiro
              const cachedProfile = await profileCache.getProfile(currentSession.user.id);
              if (cachedProfile) {
                logger.auth.cacheHit(currentSession.user.id, 'initial-session', { source: 'profileCache' });
                return cachedProfile;
              }
              
              // Buscar perfil com retry inteligente
              return await fetchUserProfileWithRetry(currentSession.user.id, 2);
            })();
            
            // ✅ TIMEOUT AUMENTADO: 10 segundos máximo para buscar perfil
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                logger.warn('Profile fetch timeout - proceeding without profile', { 
                  userId: currentSession.user.id,
                  timeoutMs: 10000,
                  suggestion: 'Check database connection and user table'
                }, 'Auth');
                resolve(null);
              }, 10000);
            });
            
            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            if (!isMounted) return;
            
            // ✅ SEMPRE AUTENTICAR: Com ou sem perfil (com sanitização)
            setUser(createSanitizedAuthUser(currentSession.user, profile || undefined));
            setAuthState('authenticated');
            setIsLoading(false);
            
            if (profile) {
              logger.auth.profileFetch(currentSession.user.id, true, 'database', { initial: true });
            } else {
              logger.warn('Proceeding without profile - user authenticated but no profile data', { userId: currentSession.user.id }, 'Auth');
            }
            
          } catch (profileError) {
            logger.error('Error fetching profile during initialization', { error: profileError.message }, 'Auth');
            
            // ✅ FALLBACK: Autenticar mesmo com erro no perfil (com sanitização)
            if (!isMounted) return;
            setUser(createSanitizedAuthUser(currentSession.user, undefined));
            setAuthState('authenticated');
            setIsLoading(false);
          }
        } else {
          logger.info('No active session found during initialization', {}, 'Auth');
          setUser(null);
          setSession(null);
          setAuthState('unauthenticated');
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Erro na verificação inicial de sessão', { error: error.message }, 'Auth', error);
        if (!isMounted) return;
        
        setUser(null);
        setSession(null);
        setAuthState('unauthenticated');
        setError(error as any);
        setIsLoading(false);
      }
    }

    getInitialSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      logger.info('Auth state change event', { event, hasSession: !!newSession }, 'Auth');

      // Processar INITIAL_SESSION
      if (event === 'INITIAL_SESSION') {
        setIsLoading(true);
        logger.debug('Processing INITIAL_SESSION event', {}, 'Auth');
        if (newSession?.user) {
          setSession(newSession);
          setAuthState('loading-profile');
          
                      // ✅ TIMEOUT AUMENTADO: 8 segundos para INITIAL_SESSION
            try {
              const profilePromise = (async () => {
                const cachedProfile = await profileCache.getProfile(newSession.user.id);
                if (cachedProfile) {
                  logger.auth.cacheHit(newSession.user.id, 'initial-session', { source: 'profileCache' });
                  return cachedProfile;
                }
                return await fetchUserProfileInternal(newSession.user.id);
              })();
              
              const timeoutPromise = new Promise<null>((resolve) => {
                setTimeout(() => {
                  logger.warn('INITIAL_SESSION profile fetch timeout', { 
                    userId: newSession.user.id,
                    timeoutMs: 8000,
                    event: 'INITIAL_SESSION'
                  }, 'Auth');
                  resolve(null);
                }, 8000);
              });
            
            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            if (isMounted) {
              setUser(createSanitizedAuthUser(newSession.user, profile || undefined));
              setAuthState('authenticated');
            }
          } catch (error) {
            if (isMounted) {
              setUser(createSanitizedAuthUser(newSession.user, undefined));
              setAuthState('authenticated');
            }
          }
        } else {
          setUser(null);
          setSession(null);
          setAuthState('unauthenticated');
        }
        setIsLoading(false);
        return;
      }

      // Para outros eventos, assumimos que uma mudança de estado está ocorrendo
      setIsLoading(true);

      if (event === 'SIGNED_IN') {
        if (newSession?.user) {
          logger.info('Processing SIGNED_IN event', {
            userId: newSession.user.id,
            email: newSession.user.email,
            hasSession: !!newSession
          }, 'Auth');
          
          setAuthState('loading-profile');
          
          // ✅ TIMEOUT PARA SIGN_IN: 3 segundos
          try {
            const profilePromise = (async () => {
              const cachedProfile = await profileCache.getProfile(newSession.user.id);
              if (cachedProfile) {
                logger.auth.cacheHit(newSession.user.id, 'sign-in', { source: 'profileCache' });
                return cachedProfile;
              }
              return await fetchUserProfileInternal(newSession.user.id);
            })();
            
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                logger.warn('SIGNED_IN profile fetch timeout', { userId: newSession.user.id }, 'Auth');
                resolve(null);
              }, 3000);
            });
            
            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            if (!isMounted) return;
            
            logger.auth.profileFetch(newSession.user.id, !!profile, profile ? 'database' : 'timeout', { event: 'SIGNED_IN' });
            setUser(createSanitizedAuthUser(newSession.user, profile || undefined));
            setSession(newSession);
            setAuthState('authenticated');
            
          } catch (error) {
            if (!isMounted) return;
            
            logger.error('Error during SIGNED_IN profile fetch', { error: error.message }, 'Auth');
            setUser(createSanitizedAuthUser(newSession.user, undefined));
            setSession(newSession);
            setAuthState('authenticated');
          }
        } else {
          logger.error('SIGNED_IN event without user in session', {}, 'Auth');
          setUser(null);
          setSession(null);
          setAuthState('unauthenticated');
        }
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        logger.info('Processing SIGNED_OUT event', {}, 'Auth');
        setUser(null);
        setSession(null);
        setAuthState('unauthenticated');
        setError(null);
        
        // Limpeza completa do cache no logout
        if (typeof window !== 'undefined') {
          profileCache.clearAll();
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          
          const keysToRemove = Object.keys(localStorage).filter(key => 
            key.includes('sb-') || 
            key.includes('supabase') || 
            key.includes('auth') ||
            key.includes('session')
          );
          
          keysToRemove.forEach(key => {
            try {
              localStorage.removeItem(key);
            } catch (error) {
              // Ignorar erros de remoção
            }
          });
          
          logger.info('Cache e dados de sessão limpos completamente', {}, 'Auth');
        }
      } else if (event === 'TOKEN_REFRESHED') {
        if (newSession?.user) {
          logger.info('Processing TOKEN_REFRESHED event', { userId: newSession.user.id }, 'Auth');
          setSession(newSession);
          setAuthState('loading-profile');
          
          // ✅ TIMEOUT PARA TOKEN_REFRESHED: 2 segundos (mais rápido)
          try {
            const profilePromise = fetchUserProfileInternal(newSession.user.id);
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                logger.warn('TOKEN_REFRESHED profile fetch timeout', { userId: newSession.user.id }, 'Auth');
                resolve(null);
              }, 2000);
            });
            
            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            if (isMounted) {
              setUser({ ...newSession.user, profile: profile || undefined });
              setAuthState('authenticated');
              logger.auth.profileFetch(newSession.user.id, !!profile, 'refresh', { event: 'TOKEN_REFRESHED' });
            }
          } catch (error) {
            if (isMounted) {
              setUser({ ...newSession.user, profile: undefined });
              setAuthState('authenticated');
            }
          }
        } else {
          logger.warn('TOKEN_REFRESHED event without user - logging out', {}, 'Auth');
          setUser(null);
          setSession(null);
          setAuthState('unauthenticated');
        }
        setError(null);
      } else if (event === 'PASSWORD_RECOVERY') {
        logger.info('Processing PASSWORD_RECOVERY event', {}, 'Auth');
        setUser(newSession?.user || null); 
        setSession(newSession);
        setAuthState(newSession?.user ? 'authenticated' : 'unauthenticated');
        setError(null);
      } else if (event === 'USER_UPDATED') {
        logger.info('Processing USER_UPDATED event', { userId: newSession?.user?.id }, 'Auth');
        if (newSession?.user) {
          // ✅ TIMEOUT PARA USER_UPDATED: 2 segundos
          try {
            const profilePromise = fetchUserProfileInternal(newSession.user.id);
            const timeoutPromise = new Promise<null>((resolve) => {
              setTimeout(() => {
                logger.warn('USER_UPDATED profile fetch timeout', { userId: newSession.user.id }, 'Auth');
                resolve(null);
              }, 2000);
            });
            
            const profile = await Promise.race([profilePromise, timeoutPromise]);
            
            if (!isMounted) return;
            
            setUser({ ...newSession.user, profile: profile || undefined });
            setAuthState('authenticated');
          } catch (error) {
            if (!isMounted) return;
            setUser({ ...newSession.user, profile: undefined });
            setAuthState('authenticated');
          }
        }
        
        if (newSession) {
          setSession(newSession);
        }
        setError(null);
      }
      
      if (isMounted) {
        setIsLoading(false);
      }
      if (newSession?.user && isMounted) {
        updateLastActivity();
      }
    });
    
    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const signInWithPasswordHandler = useMemo(() => async (credentials: SignInWithPasswordCredentials) => {
    // Log adaptado para cobrir tanto email quanto phone
    const identifier = 'email' in credentials ? credentials.email : 'phone' in credentials ? credentials.phone : 'unknown';
    logger.auth.login(identifier, false, { attempt: 'start' });
    setIsLoading(true);
    setError(null);
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(credentials);

    if (signInError) {
      logger.auth.login(identifier, false, { error: signInError.message });
      setError(signInError);
      setUser(null); 
      setSession(null);
      setIsLoading(false);
      return { error: signInError, user: null, session: null };
    }

    logger.auth.login(identifier, true, { userId: signInData.user?.id });

    if (signInData.user && signInData.session) {
      logger.debug('User and session present, fetching profile', { userId: signInData.user.id }, 'Auth');
      
      // ✅ PHASE 1: fetchUserProfileInternal já tem retry logic robusto e gerencia cache automaticamente
      const profile = await fetchUserProfileInternal(signInData.user.id);
      
      logger.auth.profileFetch(signInData.user.id, !!profile, profile ? 'database' : 'failed', { context: 'sign-in' });
      
      if (!profile) {
        logger.warn('Profile not found for user, continuing without profile', { userId: signInData.user.id }, 'Auth');
      }

      const enrichedUser = { ...signInData.user, profile: profile || undefined };
      setUser(enrichedUser);
      setSession(signInData.session);
      setIsLoading(false);
      
      // DEBUG: Verificar se o e-mail foi confirmado
      if (signInData.user.email_confirmed_at) {
        logger.info('E-mail verificado - login com confirmação', { email: signInData.user.email }, 'Auth');
      } else {
        logger.warn('E-mail ainda não verificado', { email: signInData.user.email }, 'Auth');
      }
      
      logger.info('Login flow completed successfully', { userId: signInData.user.id }, 'Auth');
      return { error: null, user: enrichedUser, session: signInData.session };
    } 
    
    logger.warn('Login successful but missing user or session data', { 
      hasUser: !!signInData.user, 
      hasSession: !!signInData.session 
    }, 'Auth');
    setUser(null);
    setSession(null);
    setIsLoading(false);
    return { error: new Error('Login bem-sucedido mas sem dados de usuário ou sessão.') as AuthError, user: null, session: null };
  }, [supabase, fetchUserProfileInternal]);

  const signUpWithPasswordHandler = useMemo(() => async (credentials: SignUpWithPasswordCredentials) => {
    logger.info('Starting sign-up process', {}, 'Auth');
    setIsLoading(true);
    setError(null);

    // SIMPLIFICADO: Remover configuração explícita de emailRedirectTo para permitir fluxo PKCE padrão
    let signUpParams: SignUpWithPasswordCredentials;

    if ('email' in credentials && credentials.email) {
      signUpParams = {
        email: credentials.email,
        password: credentials.password,
        options: {
          data: credentials.options?.data, // Manter apenas os dados do usuário
        }
      };
      logger.debug('Configured for email signup', { email: credentials.email }, 'Auth');
    } else if ('phone' in credentials && credentials.phone) {
      signUpParams = {
        phone: credentials.phone,
        password: credentials.password,
        options: {
          data: credentials.options?.data,
          channel: credentials.options?.channel
        }
      };
      logger.debug('Configured for phone signup', { phone: credentials.phone }, 'Auth');
    } else {
      const errorMsg = 'Credenciais de registro inválidas.';
      logger.error(errorMsg, {}, 'Auth');
      setError(new Error(errorMsg) as AuthError);
      setIsLoading(false);
      return { error: new Error(errorMsg) as AuthError, user: null, session: null };
    }

    logger.debug('Calling supabase.auth.signUp', {}, 'Auth');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(signUpParams);

    if (signUpError) {
      logger.error('Sign-up error', { error: signUpError.message }, 'Auth', signUpError);
      setError(signUpError);
      setIsLoading(false);
      return { error: signUpError, user: null, session: null };
    }

    if (signUpData.user) {
      // ✅ CORREÇÃO: Para fluxo SaaS seguro, não manter sessão ativa após cadastro
      // O usuário deve confirmar e-mail e fazer login ativo posteriormente
      logger.info('Sign-up successful, clearing session for email confirmation flow', { userId: signUpData.user.id }, 'Auth');
      
      // Limpar qualquer sessão temporária criada pelo signUp
      if (signUpData.session) {
        logger.debug('Clearing temporary session created during sign-up', {}, 'Auth');
        await supabase.auth.signOut();
      }
      
      // Retornar dados do usuário para logs/confirmação, mas sem manter estado ativo
      const basicUser = { ...signUpData.user, profile: undefined };
      setUser(null); // ✅ Não manter usuário no estado
      setSession(null); // ✅ Não manter sessão no estado
      setAuthState('unauthenticated'); // ✅ Estado correto para usuário não confirmado
      setIsLoading(false);
      
      return { error: null, user: basicUser, session: signUpData.session };
    }

    setIsLoading(false);
    return { error: new Error('Registro bem-sucedido mas sem dados de usuário.') as AuthError, user: null, session: null };
  }, [supabase]);

  const signOutHandler = useMemo(() => async () => {
    logger.info('Starting sign-out process', {}, 'Auth');
    setIsLoading(true);
    setError(null);
    
    try {
      // Adicionar timeout de 10 segundos para o signOut
      const timeoutPromise = new Promise<{ error: any }>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout: signOut demorou mais de 10 segundos')), 10000);
      });

      const signOutPromise = supabase.auth.signOut();

      // Usar Promise.race para implementar timeout
      const result = await Promise.race([signOutPromise, timeoutPromise]);
      
      logger.info('Supabase sign-out completed', { hasError: !!result.error }, 'Auth');

      if (result.error) {
        logger.error('Error during Supabase sign-out', { error: result.error.message }, 'Auth', result.error);
        setError(result.error);
      } else {
        logger.info('Supabase sign-out successful', {}, 'Auth');
      }

      // Independente do resultado do Supabase, limpar o estado local
      logger.debug('Clearing local state after sign-out', {}, 'Auth');
      setUser(null);
      setSession(null);
      
      setIsLoading(false);
      logger.info('Sign-out process completed', {}, 'Auth');
      return { error: result.error || null };

    } catch (error: any) {
      logger.error('Exception during sign-out (possibly timeout)', { error: error.message }, 'Auth', error);
      
      // Mesmo com erro/timeout, limpar o estado local para deslogar o usuário
      logger.debug('Clearing local state due to sign-out error/timeout', {}, 'Auth');
      setUser(null);
      setSession(null);
      setError(error);
      setIsLoading(false);
      
      return { error };
    }
  }, [supabase]);

  const sendPasswordResetEmailHandler = useMemo(() => async (email: string) => {
    setIsLoading(true);
    setError(null);
    
    // Definir explicitamente a URL de redirecionamento para a página de nova senha
    const redirectTo = `${window.location.origin}/cliente/nova-senha`;
    logger.info('Sending password reset email', { email: email, redirectTo: redirectTo }, 'Auth');
    
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo,
    });
    
    if (resetError) {
      logger.error('Error sending password reset email', { error: resetError.message }, 'Auth', resetError);
      setError(resetError);
    } else {
      logger.info('Password reset email sent successfully via Supabase native system', { email: email }, 'Auth');
    }
    
    setIsLoading(false);
    return { error: resetError };
  }, [supabase]);

  const checkSessionHandler = useMemo(() => async (): Promise<boolean> => {
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();
    if (getSessionError) {
      logger.error('Error checking session', { error: getSessionError.message }, 'Auth', getSessionError);
      return false;
    }
    return !!currentSession;
  }, [supabase]);

  const value = useMemo(() => ({
    user,
    session,
    isLoading,
    authState,
    error,
    isAuthenticated: !!session && !!user?.email_confirmed_at && authState === 'authenticated',
    signInWithPassword: signInWithPasswordHandler,
    signUpWithPassword: signUpWithPasswordHandler,
    signOut: signOutHandler,
    sendPasswordResetEmail: sendPasswordResetEmailHandler,
    checkSession: checkSessionHandler,
  }), [user, session, isLoading, authState, error, signInWithPasswordHandler, signUpWithPasswordHandler, signOutHandler, sendPasswordResetEmailHandler, checkSessionHandler]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Exporta o contexto para que possa ser usado pelo hook useAuth
export { AuthContext };

// ✅ CORREÇÃO REACT #130: Função para sanitizar objetos do Supabase
function sanitizeSupabaseUser(user: SupabaseUser): Record<string, any> {
  if (!user) return {};
  
  // Criar um objeto plain sem protótipos problemáticos
  const sanitizedUser: Record<string, any> = {};
  
  // Copiar propriedades essenciais do usuário
  const essentialProps = [
    'id', 'email', 'phone', 'email_confirmed_at', 'phone_confirmed_at',
    'last_sign_in_at', 'created_at', 'updated_at', 'role', 'aud'
  ];
  
  essentialProps.forEach(prop => {
    if (user[prop as keyof SupabaseUser] !== undefined) {
      const value = user[prop as keyof SupabaseUser];
      // Converter datas para strings ISO se necessário
      if (value instanceof Date) {
        sanitizedUser[prop] = value.toISOString();
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitizedUser[prop] = value;
      }
    }
  });
  
  // Sanitizar user_metadata se existir
  if (user.user_metadata && typeof user.user_metadata === 'object') {
    sanitizedUser.user_metadata = {};
    Object.keys(user.user_metadata).forEach(key => {
      const value = user.user_metadata[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitizedUser.user_metadata[key] = value;
      }
    });
  }
  
  // Sanitizar app_metadata se existir
  if (user.app_metadata && typeof user.app_metadata === 'object') {
    sanitizedUser.app_metadata = {};
    Object.keys(user.app_metadata).forEach(key => {
      const value = user.app_metadata[key];
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitizedUser.app_metadata[key] = value;
      }
    });
  }
  
  return sanitizedUser;
}

// ✅ CORREÇÃO REACT #130: Função para criar AuthUser sanitizado
function createSanitizedAuthUser(supabaseUser: SupabaseUser, profile?: UserProfile): AuthUser {
  const sanitizedUser = sanitizeSupabaseUser(supabaseUser);
  
  return {
    ...sanitizedUser,
    profile: profile || undefined
  } as AuthUser;
}
