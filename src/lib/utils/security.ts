/**
 * Utilitários de segurança para sanitização e validação de entrada
 */

/**
 * Sanitiza string para evitar XSS
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  // Remove caracteres potencialmente perigosos
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Sanitiza objeto recursivamente
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj) return obj;
  
  // Se for um array, sanitiza cada item
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  
  // Se não for um objeto, retorna o valor como está
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  // Cria um novo objeto para armazenar os valores sanitizados
  const sanitized: Record<string, any> = {};
  
  // Itera sobre as chaves do objeto
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      // Se o valor for uma string, sanitiza
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } 
      // Se o valor for um objeto ou array, sanitiza recursivamente
      else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } 
      // Outros tipos de dados são mantidos como estão
      else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized as T;
}

/**
 * Verifica se o token fornecido é um JWT válido
 */
export function isValidJWT(token: string): boolean {
  if (!token) return false;
  
  // Um JWT consiste em três partes separadas por pontos
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  // Cada parte deve ser uma string base64 válida
  try {
    // Decodificar apenas para verificar a estrutura
    JSON.parse(atob(parts[0]));
    JSON.parse(atob(parts[1]));
    // A terceira parte é a assinatura, não precisa ser um JSON válido
    
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Valida um ID seguro para uso em URLs ou referências
 */
export function isValidId(id: string): boolean {
  if (!id) return false;
  
  // Verifica se o ID tem apenas caracteres alfanuméricos, traços e underscores
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * Valida um email
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  // Expressão regular para validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Limita o tamanho de uma string e adiciona ellipsis se necessário
 */
export function truncateString(str: string, maxLength: number = 100): string {
  if (!str) return '';
  
  if (str.length <= maxLength) return str;
  
  return str.substring(0, maxLength) + '...';
} 