/**
 * Utilitário para padronizar mensagens de erro de autenticação
 * Converte erros técnicos do Supabase em mensagens amigáveis para o usuário
 */

export interface AuthErrorMessage {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

/**
 * Mapeia erros de autenticação para mensagens amigáveis ao usuário
 */
export function getAuthErrorMessage(error: any): AuthErrorMessage {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  // Mensagens específicas baseadas no erro do Supabase
  if (errorMessage.includes('invalid login credentials') || 
      errorMessage.includes('invalid credentials') ||
      errorCode.includes('invalid_credentials')) {
    return {
      title: 'Credenciais Inválidas',
      message: 'Email ou senha incorretos. Verifique seus dados e tente novamente.',
      type: 'error'
    };
  }

  if (errorMessage.includes('email not confirmed') || 
      errorCode.includes('email_not_confirmed')) {
    return {
      title: 'Email Não Confirmado',
      message: 'Verifique sua caixa de entrada e confirme seu email antes de fazer login.',
      type: 'warning'
    };
  }

  if (errorMessage.includes('too many requests') || 
      errorCode.includes('too_many_requests')) {
    return {
      title: 'Muitas Tentativas',
      message: 'Aguarde alguns minutos antes de tentar novamente.',
      type: 'warning'
    };
  }

  if (errorMessage.includes('user not found') || 
      errorCode.includes('user_not_found')) {
    return {
      title: 'Usuário Não Encontrado',
      message: 'Não existe uma conta cadastrada com este email.',
      type: 'error'
    };
  }

  if (errorMessage.includes('invalid email') || 
      errorCode.includes('invalid_email')) {
    return {
      title: 'Email Inválido',
      message: 'Por favor, insira um endereço de email válido.',
      type: 'error'
    };
  }

  if (errorMessage.includes('weak password') || 
      errorCode.includes('weak_password')) {
    return {
      title: 'Senha Muito Fraca',
      message: 'A senha deve ter pelo menos 6 caracteres.',
      type: 'error'
    };
  }

  if (errorMessage.includes('network') || 
      errorMessage.includes('connection') ||
      errorCode.includes('network_error')) {
    return {
      title: 'Erro de Conexão',
      message: 'Verifique sua conexão com a internet e tente novamente.',
      type: 'error'
    };
  }

  if (errorMessage.includes('signup disabled') || 
      errorCode.includes('signup_disabled')) {
    return {
      title: 'Cadastro Indisponível',
      message: 'O cadastro está temporariamente indisponível.',
      type: 'warning'
    };
  }

  if (errorMessage.includes('timeout')) {
    return {
      title: 'Tempo Esgotado',
      message: 'A operação demorou mais que o esperado. Tente novamente.',
      type: 'error'
    };
  }

  // Mensagem genérica para outros erros
  return {
    title: 'Erro de Autenticação',
    message: 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.',
    type: 'error'
  };
}

/**
 * Mensagens de sucesso para operações de autenticação
 */
export const AUTH_SUCCESS_MESSAGES = {
  LOGIN: {
    title: 'Login Realizado',
    message: 'Bem-vindo! Redirecionando...',
    type: 'success' as const
  },
  REGISTER: {
    title: 'Conta Criada',
    message: 'Sua conta foi criada com sucesso!',
    type: 'success' as const
  },
  PASSWORD_RESET_SENT: {
    title: 'Email Enviado',
    message: 'Verifique sua caixa de entrada para redefinir sua senha.',
    type: 'success' as const
  },
  PASSWORD_UPDATED: {
    title: 'Senha Atualizada',
    message: 'Sua senha foi alterada com sucesso!',
    type: 'success' as const
  },
  EMAIL_CONFIRMED: {
    title: 'Email Confirmado',
    message: 'Seu email foi confirmado com sucesso!',
    type: 'success' as const
  }
} as const;

/**
 * Mensagens de validação para campos do formulário
 */
export const VALIDATION_MESSAGES = {
  REQUIRED_FIELDS: {
    title: 'Campos Obrigatórios',
    message: 'Por favor, preencha todos os campos obrigatórios.',
    type: 'warning' as const
  },
  INVALID_EMAIL: {
    title: 'Email Inválido',
    message: 'Por favor, insira um endereço de email válido.',
    type: 'error' as const
  },
  PASSWORD_TOO_SHORT: {
    title: 'Senha Muito Curta',
    message: 'A senha deve ter pelo menos 6 caracteres.',
    type: 'error' as const
  },
  PASSWORDS_DONT_MATCH: {
    title: 'Senhas Não Coincidem',
    message: 'As senhas informadas não são iguais.',
    type: 'error' as const
  }
} as const; 