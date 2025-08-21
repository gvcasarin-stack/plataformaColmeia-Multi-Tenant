// Tipos para API de confirmação de email SaaS-grade

export interface ConfirmEmailRequest {
  token_hash?: string;
  code?: string;
  type?: 'email' | 'phone';
}

export interface ConfirmEmailResponse {
  success: boolean;
  message: string;
  data: {
    confirmed: boolean;
    userId: string;
    email: string;
    confirmedAt: string;
  };
}

export interface ConfirmEmailErrorResponse {
  error: 'TOKEN_MISSING' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'CONFIRMATION_FAILED' | 'INTERNAL_ERROR' | 'UNEXPECTED_ERROR';
  message: string;
}

// Tipos para outras APIs (expansível)
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface HealthCheckResponse {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
}
