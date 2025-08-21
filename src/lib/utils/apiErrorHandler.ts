import { devLog } from "@/lib/utils/productionLogger";
import { NextResponse } from 'next/server';

/**
 * Tipo de erro para APIs
 * Define os campos necessários para representar um erro de API
 */
export interface ApiError {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
}

/**
 * Tipo de sucesso para APIs
 * Define os campos necessários para representar um sucesso de API
 */
export interface ApiSuccess<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Possíveis códigos de erro da API
 */
export enum ApiErrorCode {
  // Erros de validação
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  
  // Erros de autenticação
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  
  // Erros de recursos
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Erros do servidor
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  
  // Erros de operação
  OPERATION_FAILED = 'OPERATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Erros específicos
  NOTIFICATION_PROCESSING_ERROR = 'NOTIFICATION_PROCESSING_ERROR',
  EMAIL_SENDING_ERROR = 'EMAIL_SENDING_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  MISSING_PROJECT_ID = 'MISSING_PROJECT_ID',
  
  // Erros de banco de dados
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  
  // Erros de armazenamento
  STORAGE_ERROR = 'STORAGE_ERROR',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE'
}

/**
 * Cria uma resposta de erro para API
 * @param message Mensagem de erro
 * @param errorCode Código do erro
 * @param status Código de status HTTP
 * @param details Detalhes adicionais do erro
 * @returns NextResponse com o erro formatado
 */
export function createApiError(
  message: string,
  errorCode: string = ApiErrorCode.INTERNAL_SERVER_ERROR,
  status: number = 500,
  details?: any
): NextResponse<ApiError> {
  return NextResponse.json({
    success: false,
    error: message,
    errorCode,
    ...(details && { details }),
  }, { status });
}

/**
 * Cria uma resposta de sucesso para API
 * @param data Dados a serem retornados
 * @param message Mensagem de sucesso
 * @returns NextResponse com sucesso formatado
 */
export function createApiSuccess<T = any>(
  data?: T,
  message?: string
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({
    success: true,
    ...(data && { data }),
    ...(message && { message }),
  });
}

/**
 * Manipula exceções em rotas de API e retorna uma resposta formatada
 * @param error Erro capturado
 * @param defaultMessage Mensagem padrão caso o erro não tenha uma mensagem
 * @param defaultErrorCode Código de erro padrão
 * @returns NextResponse formatada com o erro
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = 'Ocorreu um erro interno',
  defaultErrorCode: string = ApiErrorCode.INTERNAL_SERVER_ERROR
): NextResponse<ApiError> {
  devLog.error('[API-ERROR]', error);
  
  // Se for um erro conhecido
  if (error instanceof Error) {
    return createApiError(
      error.message || defaultMessage,
      defaultErrorCode,
      500
    );
  }
  
  // Caso seja outro tipo de erro
  return createApiError(
    typeof error === 'string' ? error : defaultMessage,
    defaultErrorCode,
    500
  );
}

/**
 * Manipula erros de validação específicos em APIs
 * @param fields Lista de campos com erro e respectivas mensagens
 * @returns NextResponse formatada com erro de validação
 */
export function handleValidationError(
  fields: Record<string, string>
): NextResponse<ApiError> {
  return createApiError(
    'Erro de validação nos campos fornecidos',
    ApiErrorCode.VALIDATION_ERROR,
    400,
    { fields }
  );
}

/**
 * Manipula erro de campo obrigatório ausente
 * @param fieldName Nome do campo obrigatório
 * @returns NextResponse formatada com erro de campo obrigatório
 */
export function handleMissingRequiredField(
  fieldName: string
): NextResponse<ApiError> {
  return createApiError(
    `Campo obrigatório ausente: ${fieldName}`,
    ApiErrorCode.MISSING_REQUIRED_FIELD,
    400
  );
}

/**
 * Manipula erro de recurso não encontrado
 * @param resourceType Tipo de recurso (ex: "Projeto", "Usuário")
 * @param identifier Identificador do recurso
 * @returns NextResponse formatada com erro de recurso não encontrado
 */
export function handleResourceNotFound(
  resourceType: string,
  identifier?: string | number
): NextResponse<ApiError> {
  const message = identifier 
    ? `${resourceType} não encontrado: ${identifier}` 
    : `${resourceType} não encontrado`;
    
  return createApiError(
    message,
    ApiErrorCode.NOT_FOUND,
    404
  );
}
