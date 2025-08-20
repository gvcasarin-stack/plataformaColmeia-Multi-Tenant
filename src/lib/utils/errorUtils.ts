export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // TODO: Considerar adicionar tratamento para AuthApiError do Supabase especificamente
    // if (error.name === 'AuthApiError' && error.message) {
    //   return error.message; // Ou uma mensagem mais amigável
    // }
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  // Para outros tipos de erro, ou se a mensagem for vazia
  const defaultMessage = 'Ocorreu um erro desconhecido. Por favor, tente novamente.';
  try {
    // Tenta converter para string, caso seja um objeto com toString()
    const stringError = String(error);
    return stringError && stringError !== '[object Object]' ? stringError : defaultMessage;
  } catch (e) {
    return defaultMessage;
  }
} 