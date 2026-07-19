/**
 * @file validators.ts
 * @description Utilitários de validação e formatação para dados brasileiros (CPF, CNPJ, nomes, estados)
 */

/**
 * Lista de estados brasileiros (siglas)
 */
export const ESTADOS_BRASIL = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
] as const;

export type EstadoBrasil = typeof ESTADOS_BRASIL[number];

/**
 * Valida CPF brasileiro
 * @param cpf - CPF com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validarCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cpfLimpo = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cpfLimpo.length !== 11) return false;

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;

  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
  }
  let resto = 11 - (soma % 11);
  let digitoVerificador1 = resto >= 10 ? 0 : resto;

  if (digitoVerificador1 !== parseInt(cpfLimpo.charAt(9))) return false;

  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
  }
  resto = 11 - (soma % 11);
  let digitoVerificador2 = resto >= 10 ? 0 : resto;

  if (digitoVerificador2 !== parseInt(cpfLimpo.charAt(10))) return false;

  return true;
}

/**
 * Valida CNPJ brasileiro
 * @param cnpj - CNPJ com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validarCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  // Verifica se tem 14 dígitos
  if (cnpjLimpo.length !== 14) return false;

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpjLimpo)) return false;

  // Validação do primeiro dígito verificador
  let tamanho = cnpjLimpo.length - 2;
  let numeros = cnpjLimpo.substring(0, tamanho);
  const digitos = cnpjLimpo.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  // Validação do segundo dígito verificador
  tamanho = tamanho + 1;
  numeros = cnpjLimpo.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(1))) return false;

  return true;
}

/**
 * Valida CPF ou CNPJ
 * @param value - CPF ou CNPJ com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validarCPForCNPJ(value: string): boolean {
  const valorLimpo = value.replace(/\D/g, '');

  if (valorLimpo.length === 11) {
    return validarCPF(value);
  } else if (valorLimpo.length === 14) {
    return validarCNPJ(value);
  }

  return false;
}

/**
 * Formata CPF
 * @param cpf - CPF sem formatação
 * @returns CPF formatado (000.000.000-00)
 */
export function formatarCPF(cpf: string): string {
  const cpfLimpo = cpf.replace(/\D/g, '');

  if (cpfLimpo.length !== 11) return cpf;

  return cpfLimpo.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata CNPJ
 * @param cnpj - CNPJ sem formatação
 * @returns CNPJ formatado (00.000.000/0000-00)
 */
export function formatarCNPJ(cnpj: string): string {
  const cnpjLimpo = cnpj.replace(/\D/g, '');

  if (cnpjLimpo.length !== 14) return cnpj;

  return cnpjLimpo.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

/**
 * Formata CPF ou CNPJ automaticamente
 * @param value - CPF ou CNPJ sem formatação
 * @returns CPF ou CNPJ formatado
 */
export function formatarCPForCNPJ(value: string): string {
  const valorLimpo = value.replace(/\D/g, '');

  if (valorLimpo.length === 11) {
    return formatarCPF(value);
  } else if (valorLimpo.length === 14) {
    return formatarCNPJ(value);
  }

  return value;
}

/**
 * Remove formatação de CPF ou CNPJ
 * @param value - CPF ou CNPJ formatado
 * @returns Apenas números
 */
export function removerFormatacao(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Sanitiza nome (converte para maiúsculas e remove espaços extras)
 * @param nome - Nome a ser sanitizado
 * @returns Nome em maiúsculas e sem espaços extras
 */
export function sanitizeNome(nome: string): string {
  return nome
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' '); // Remove espaços duplicados
}

/**
 * Valida se uma sigla de estado é válida
 * @param estado - Sigla do estado (ex: "SP", "RJ")
 * @returns true se válido, false caso contrário
 */
export function validarEstado(estado: string): boolean {
  return ESTADOS_BRASIL.includes(estado.toUpperCase() as EstadoBrasil);
}

/**
 * Normaliza sigla de estado para maiúsculas
 * @param estado - Sigla do estado
 * @returns Sigla em maiúsculas
 */
export function normalizarEstado(estado: string): string {
  return estado.toUpperCase().trim();
}

/**
 * Valida formato de e-mail
 * @param email - E-mail a ser validado
 * @returns true se o formato é válido, false caso contrário
 */
export function validarEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Valida CEP brasileiro (8 dígitos)
 * @param cep - CEP com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validarCEP(cep: string): boolean {
  return /^\d{8}$/.test(cep.replace(/\D/g, ''));
}

/**
 * Valida telefone brasileiro (fixo com 10 dígitos ou celular com 11 dígitos, incluindo DDD)
 * @param telefone - Telefone com ou sem formatação
 * @returns true se válido, false caso contrário
 */
export function validarTelefone(telefone: string): boolean {
  const digitos = telefone.replace(/\D/g, '');
  return digitos.length === 10 || digitos.length === 11;
}
