/**
 * ✅ SUPABASE - Configurações de segurança de sessão otimizadas
 */

// ⚙️ Configurações principais de segurança
export const INACTIVITY_TIME_MS = 20 * 60 * 1000; // 20 minutos de inatividade
export const WARNING_TIME_MS = 2 * 60 * 1000; // Avisar 2 minutos antes
export const WARNING_TIME_SECONDS = WARNING_TIME_MS / 1000; // Para contagem regressiva

// 🔒 Configurações de sessão segura
export const SESSION_SECURITY = {
  MAX_SESSION_DURATION: 8 * 60 * 60 * 1000, // 8 horas máximo logado
  FORCE_LOGOUT_ON_BROWSER_CLOSE: true, // Logout ao fechar navegador
  DISABLE_AUTO_LOGIN: true, // Desabilitar login automático
  CLEAR_STORAGE_ON_LOGOUT: true, // Limpar storage no logout
} as const;

// Configurações por perfil de usuário (para futuras implementações)
export const INACTIVITY_SETTINGS = {
  superadmin: {
    inactivityTime: 15 * 60 * 1000, // 15 minutos
    warningTime: 2 * 60 * 1000,     // 2 minutos
  },
  admin: {
    inactivityTime: 20 * 60 * 1000, // 20 minutos
    warningTime: 2 * 60 * 1000,     // 2 minutos
  },
  user: {
    inactivityTime: 30 * 60 * 1000, // 30 minutos
    warningTime: 2 * 60 * 1000,     // 2 minutos
  },
};
