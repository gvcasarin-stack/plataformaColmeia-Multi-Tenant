// 🚀 Sistema de Hardening de Segurança - FASE 2
// Headers de segurança, rate limiting, validação de input e monitoramento

import { logger } from '@/lib/utils/logger';

// Interfaces para segurança
interface SecurityConfig {
  enableRateLimiting: boolean;
  enableSecurityHeaders: boolean;
  enableInputValidation: boolean;
  enableCSPHeaders: boolean;
  enableSecurityMonitoring: boolean;
  rateLimitRequests: number;
  rateLimitWindow: number; // em ms
  maxInputLength: number;
  enableXSSProtection: boolean;
  enableCSRFProtection: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastRequest: number;
}

interface SecurityMetrics {
  totalRequests: number;
  blockedRequests: number;
  rateLimitViolations: number;
  xssAttempts: number;
  sqlInjectionAttempts: number;
  suspiciousActivity: number;
  lastSecurityScan: string;
}

interface SecurityThreat {
  id: string;
  type: 'rate_limit' | 'xss' | 'sql_injection' | 'csrf' | 'suspicious_input';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  data: any;
  timestamp: number;
  blocked: boolean;
}

/**
 * 🛡️ Sistema de Hardening de Segurança Enterprise
 * 
 * Features:
 * - Rate limiting inteligente
 * - Headers de segurança automáticos
 * - Validação de input rigorosa
 * - Proteção XSS e CSRF
 * - Monitoramento de ameaças
 * - Detecção de SQL injection
 * - Content Security Policy
 * - Logs de segurança estruturados
 */
class SecurityHardening {
  private static instance: SecurityHardening;
  private config: SecurityConfig;
  private rateLimitMap = new Map<string, RateLimitEntry>();
  private securityThreats: SecurityThreat[] = [];
  private suspiciousIPs = new Set<string>();
  
  // Padrões de detecção de ameaças
  private readonly XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
    /eval\s*\(/gi,
    /expression\s*\(/gi
  ];

  private readonly SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
    /(['"])\s*;\s*\w+/gi,
    /\b(INFORMATION_SCHEMA|SYSOBJECTS|SYSCOLUMNS)\b/gi,
    /--\s*$/gi,
    /\/\*.*?\*\//gi
  ];

  private readonly SUSPICIOUS_PATTERNS = [
    /\.\.\//gi,
    /\.(exe|bat|cmd|sh|ps1)$/gi,
    /file:\/\//gi,
    /data:(?!image\/)/gi,
    /%2e%2e%2f/gi,
    /\0/gi
  ];

  private constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableRateLimiting: true,
      enableSecurityHeaders: true,
      enableInputValidation: true,
      enableCSPHeaders: true,
      enableSecurityMonitoring: true,
      rateLimitRequests: 100,        // 100 requests
      rateLimitWindow: 15 * 60 * 1000, // por 15 minutos
      maxInputLength: 10000,         // 10KB max input
      enableXSSProtection: true,
      enableCSRFProtection: true,
      ...config
    };

    this.initializeSecurity();
    logger.info('Security hardening initialized', { config: this.config }, 'SecurityHardening');
  }

  static getInstance(config?: Partial<SecurityConfig>): SecurityHardening {
    if (!SecurityHardening.instance) {
      SecurityHardening.instance = new SecurityHardening(config);
    }
    return SecurityHardening.instance;
  }

  /**
   * 🚫 Verificar rate limiting
   */
  checkRateLimit(clientId: string, endpoint?: string): { allowed: boolean; resetTime?: number } {
    if (!this.config.enableRateLimiting) {
      return { allowed: true };
    }

    const key = endpoint ? `${clientId}:${endpoint}` : clientId;
    const now = Date.now();
    const entry = this.rateLimitMap.get(key);

    if (!entry) {
      // Primeira request
      this.rateLimitMap.set(key, {
        count: 1,
        resetTime: now + this.config.rateLimitWindow,
        lastRequest: now
      });
      return { allowed: true };
    }

    // Verificar se a janela de tempo resetou
    if (now > entry.resetTime) {
      entry.count = 1;
      entry.resetTime = now + this.config.rateLimitWindow;
      entry.lastRequest = now;
      return { allowed: true };
    }

    // Verificar limite
    if (entry.count >= this.config.rateLimitRequests) {
      this.recordSecurityThreat({
        type: 'rate_limit',
        severity: 'medium',
        source: clientId,
        data: { count: entry.count, endpoint },
        blocked: true
      });

      logger.warn('Rate limit exceeded', {
        clientId,
        endpoint,
        count: entry.count,
        limit: this.config.rateLimitRequests
      }, 'SecurityHardening');

      return { allowed: false, resetTime: entry.resetTime };
    }

    // Incrementar contador
    entry.count++;
    entry.lastRequest = now;
    return { allowed: true };
  }

  /**
   * 🔍 Validar input para ameaças
   */
  validateInput(input: string, context?: string): { 
    valid: boolean; 
    threats: string[]; 
    sanitized?: string 
  } {
    if (!this.config.enableInputValidation) {
      return { valid: true, threats: [] };
    }

    if (typeof input !== 'string') {
      return { valid: false, threats: ['Invalid input type'] };
    }

    // Verificar tamanho
    if (input.length > this.config.maxInputLength) {
      this.recordSecurityThreat({
        type: 'suspicious_input',
        severity: 'low',
        source: context || 'unknown',
        data: { inputLength: input.length, maxAllowed: this.config.maxInputLength },
        blocked: true
      });

      return { 
        valid: false, 
        threats: [`Input too long: ${input.length} > ${this.config.maxInputLength}`] 
      };
    }

    const threats: string[] = [];
    
    // Verificar XSS
    if (this.config.enableXSSProtection) {
      for (const pattern of this.XSS_PATTERNS) {
        if (pattern.test(input)) {
          threats.push('XSS attempt detected');
          this.recordSecurityThreat({
            type: 'xss',
            severity: 'high',
            source: context || 'unknown',
            data: { input: input.substring(0, 100) },
            blocked: true
          });
          break;
        }
      }
    }

    // Verificar SQL Injection
    for (const pattern of this.SQL_INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        threats.push('SQL injection attempt detected');
        this.recordSecurityThreat({
          type: 'sql_injection',
          severity: 'critical',
          source: context || 'unknown',
          data: { input: input.substring(0, 100) },
          blocked: true
        });
        break;
      }
    }

    // Verificar padrões suspeitos
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        threats.push('Suspicious pattern detected');
        this.recordSecurityThreat({
          type: 'suspicious_input',
          severity: 'medium',
          source: context || 'unknown',
          data: { input: input.substring(0, 100) },
          blocked: true
        });
        break;
      }
    }

    // Sanitizar se necessário
    let sanitized = input;
    if (threats.length > 0) {
      sanitized = this.sanitizeInput(input);
    }

    return {
      valid: threats.length === 0,
      threats,
      sanitized: threats.length > 0 ? sanitized : undefined
    };
  }

  /**
   * 🧼 Sanitizar input
   */
  sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;')
      .replace(/\//g, '&#x2F;')
      .trim();
  }

  /**
   * 🛡️ Gerar headers de segurança
   */
  getSecurityHeaders(): Record<string, string> {
    if (!this.config.enableSecurityHeaders) {
      return {};
    }

    const headers: Record<string, string> = {
      // Prevenir MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // Proteção XSS
      'X-XSS-Protection': '1; mode=block',
      
      // Prevenir clickjacking
      'X-Frame-Options': 'DENY',
      
      // Forçar HTTPS
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Controlar referrer
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

    // Content Security Policy
    if (this.config.enableCSPHeaders) {
      headers['Content-Security-Policy'] = this.generateCSP();
    }

    return headers;
  }

  /**
   * 🔐 Gerar token CSRF
   */
  generateCSRFToken(): string {
    if (!this.config.enableCSRFProtection) {
      return '';
    }

    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    const token = btoa(`${timestamp}:${random}`);
    
    logger.debug('CSRF token generated', { tokenLength: token.length }, 'SecurityHardening');
    return token;
  }

  /**
   * ✅ Validar token CSRF
   */
  validateCSRFToken(token: string, maxAge = 3600000): boolean { // 1 hora
    if (!this.config.enableCSRFProtection) {
      return true;
    }

    try {
      const decoded = atob(token);
      const [timestamp, random] = decoded.split(':');
      
      if (!timestamp || !random) return false;
      
      const tokenAge = Date.now() - parseInt(timestamp);
      const isValid = tokenAge <= maxAge;
      
      if (!isValid) {
        this.recordSecurityThreat({
          type: 'csrf',
          severity: 'medium',
          source: 'csrf_validation',
          data: { tokenAge, maxAge },
          blocked: true
        });
      }
      
      return isValid;

    } catch (error) {
      logger.warn('Invalid CSRF token format', { error: error.message }, 'SecurityHardening');
      return false;
    }
  }

  /**
   * 📊 Obter métricas de segurança
   */
  getSecurityMetrics(): SecurityMetrics {
    const recentThreats = this.securityThreats.filter(
      threat => Date.now() - threat.timestamp < 3600000 // Última hora
    );

    const totalRequests = recentThreats.length;
    const blockedRequests = recentThreats.filter(t => t.blocked).length;
    const rateLimitViolations = recentThreats.filter(t => t.type === 'rate_limit').length;
    const xssAttempts = recentThreats.filter(t => t.type === 'xss').length;
    const sqlInjectionAttempts = recentThreats.filter(t => t.type === 'sql_injection').length;
    const suspiciousActivity = recentThreats.filter(t => t.type === 'suspicious_input').length;

    return {
      totalRequests,
      blockedRequests,
      rateLimitViolations,
      xssAttempts,
      sqlInjectionAttempts,
      suspiciousActivity,
      lastSecurityScan: new Date().toISOString()
    };
  }

  /**
   * 🚨 Obter ameaças recentes
   */
  getRecentThreats(hours = 24): SecurityThreat[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.securityThreats.filter(threat => threat.timestamp > cutoffTime);
  }

  /**
   * 🧹 Limpar dados antigos
   */
  cleanup(): void {
    const now = Date.now();
    
    // Limpar rate limit expirado
    for (const [key, entry] of this.rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        this.rateLimitMap.delete(key);
      }
    }

    // Limpar ameaças antigas (mais de 7 dias)
    const cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
    this.securityThreats = this.securityThreats.filter(
      threat => threat.timestamp > cutoffTime
    );

    logger.debug('Security data cleanup completed', {
      rateLimitEntries: this.rateLimitMap.size,
      threatRecords: this.securityThreats.length
    }, 'SecurityHardening');
  }

  /**
   * ⚙️ Atualizar configuração
   */
  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Security config updated', { newConfig }, 'SecurityHardening');
  }

  // === MÉTODOS PRIVADOS ===

  private initializeSecurity(): void {
    // Configurar limpeza automática
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // A cada 5 minutos

    // Monitoramento de segurança
    if (this.config.enableSecurityMonitoring) {
      setInterval(() => {
        const metrics = this.getSecurityMetrics();
        
        // Alertar sobre atividade suspeita alta
        if (metrics.blockedRequests > 10) {
          logger.warn('High security threat activity detected', metrics, 'SecurityHardening');
        }

        // Log de métricas regulares
        logger.info('Security metrics', metrics, 'SecurityHardening');
      }, 15 * 60 * 1000); // A cada 15 minutos
    }
  }

  private recordSecurityThreat(threat: Omit<SecurityThreat, 'id' | 'timestamp'>): void {
    const fullThreat: SecurityThreat = {
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...threat
    };

    this.securityThreats.push(fullThreat);
    
    // Manter apenas os últimos 1000 registros
    if (this.securityThreats.length > 1000) {
      this.securityThreats = this.securityThreats.slice(-1000);
    }

    // Log da ameaça
    logger.warn('Security threat detected', {
      threatId: fullThreat.id,
      type: fullThreat.type,
      severity: fullThreat.severity,
      source: fullThreat.source,
      blocked: fullThreat.blocked
    }, 'SecurityHardening');

    // Alertar para ameaças críticas
    if (fullThreat.severity === 'critical') {
      logger.error('CRITICAL security threat detected', fullThreat, 'SecurityHardening');
    }
  }

  private generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    return directives.join('; ');
  }
}

// Instância global
export const securityHardening = SecurityHardening.getInstance();

// Funções de conveniência
export const checkRateLimit = (clientId: string, endpoint?: string) => 
  securityHardening.checkRateLimit(clientId, endpoint);

export const validateInput = (input: string, context?: string) => 
  securityHardening.validateInput(input, context);

export const sanitizeInput = (input: string) => 
  securityHardening.sanitizeInput(input);

export const getSecurityHeaders = () => 
  securityHardening.getSecurityHeaders();

export const generateCSRFToken = () => 
  securityHardening.generateCSRFToken();

export const validateCSRFToken = (token: string, maxAge?: number) => 
  securityHardening.validateCSRFToken(token, maxAge);

export const getSecurityMetrics = () => 
  securityHardening.getSecurityMetrics();

export const getRecentSecurityThreats = (hours?: number) => 
  securityHardening.getRecentThreats(hours);

// Exportar tipos
export type { SecurityConfig, SecurityMetrics, SecurityThreat };
