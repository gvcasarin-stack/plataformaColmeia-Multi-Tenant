/**
 * Utilitário centralizado para ícones de notificações
 * Retorna o ícone apropriado com cor para cada tipo de notificação
 *
 * Tipos implementados no sistema:
 * - new_project: Novo projeto criado
 * - new_comment: Novo comentário (admin ou cliente)
 * - document_upload: Upload de documento
 * - status_change: Mudança de status do projeto
 * - system_message: Mensagem do sistema
 */

import React from 'react';
import {
  FolderPlus,
  MessageSquare,
  FileUp,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export type NotificationIconType =
  | 'new_project'
  | 'new_comment'
  | 'document_upload'
  | 'status_change'
  | 'system_message';

interface NotificationIconConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  label: string;
}

/**
 * Configuração de ícones e cores para cada tipo de notificação
 * Cores escolhidas para um visual profissional e intuitivo de SaaS
 */
const notificationIconConfig: Record<NotificationIconType, NotificationIconConfig> = {
  // Projeto criado - Verde (positivo, novo começo)
  new_project: {
    icon: FolderPlus,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    label: 'Novo Projeto'
  },

  // Comentário - Azul (comunicação)
  new_comment: {
    icon: MessageSquare,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    label: 'Novo Comentário'
  },

  // Upload de documento - Laranja (ação, envio)
  document_upload: {
    icon: FileUp,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    label: 'Documento Enviado'
  },

  // Mudança de status - Roxo (transformação)
  status_change: {
    icon: RefreshCw,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    label: 'Status Alterado'
  },

  // Mensagem do sistema - Cinza (neutro, informativo)
  system_message: {
    icon: AlertCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/30',
    label: 'Mensagem do Sistema'
  }
};

/**
 * Retorna o componente de ícone apropriado para o tipo de notificação
 * com cores e estilos profissionais
 */
export function getNotificationIcon(type: NotificationIconType, size: 'sm' | 'md' | 'lg' = 'md') {
  const config = notificationIconConfig[type] || notificationIconConfig.system_message;
  const Icon = config.icon;

  // Tamanhos dos ícones
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }[size];

  return (
    <div className={`${config.bgColor} p-2 rounded-lg flex items-center justify-center transition-colors`}>
      <Icon className={`${config.color} ${sizeClass}`} />
    </div>
  );
}

/**
 * Retorna apenas o ícone sem o container de fundo
 * Útil para casos onde você quer customizar o container
 */
export function getNotificationIconOnly(type: NotificationIconType, className?: string) {
  const config = notificationIconConfig[type] || notificationIconConfig.system_message;
  const Icon = config.icon;

  return <Icon className={`${config.color} ${className || 'h-5 w-5'}`} />;
}

/**
 * Retorna a configuração completa do ícone
 * Útil para casos customizados
 */
export function getNotificationIconConfig(type: NotificationIconType): NotificationIconConfig {
  return notificationIconConfig[type] || notificationIconConfig.system_message;
}

/**
 * Retorna a cor hex do tipo de notificação
 * Útil para uso em estilos inline
 */
export function getNotificationColor(type: NotificationIconType): string {
  const colorMap: Record<NotificationIconType, string> = {
    new_project: '#10b981',      // emerald-600
    new_comment: '#3b82f6',      // blue-600
    document_upload: '#f97316',  // orange-600
    status_change: '#a855f7',    // purple-600
    system_message: '#6b7280'    // gray-600
  };

  return colorMap[type] || colorMap.system_message;
}
