/**
 * AVISO: Este arquivo serve apenas como um redirecionador para o novo serviço de notificações
 * Para novas implementações, utilize as funções de src/lib/services/notificationService/index.ts
 * 
 * Este arquivo será removido gradualmente à medida que todo o código seja migrado para a nova estrutura.
 */

// Re-exportar tudo do novo serviço
export * from './notificationService/index';

// Nota: Todas as funções existentes são redirecionadas para as novas funções
// A migração completa acontecerá gradualmente para não quebrar funcionalidades existentes