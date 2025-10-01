/**
 * Configuração do Stripe para integração de pagamentos
 * Sistema SaaS - SGF Multi-Tenant
 *
 * IMPORTANTE: Os valores dos planos agora vêm do banco de dados (tabela plans)
 * Esta configuração mantém apenas os IDs do Stripe para compatibilidade
 */

import { devLog } from '@/lib/utils/productionLogger';

// DEPRECADO: IDs do Stripe agora vêm do banco de dados (tabela plans)
// Mantido apenas como fallback de segurança
export const STRIPE_IDS = {
  basico: {
    productId: 'prod_SFxl9TpTXNL0YZ',
    priceId: 'price_1RLRppAkIzZurozaQOxPIBAL',
  },
  profissional: {
    productId: 'prod_SFyTYFsmWx4aco',
    priceId: 'price_1RLSWCAkIzZurozaH6jYWzQW',
  }
} as const;

// Cache dos planos em memória (atualizado a cada requisição)
let plansCache: any = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Busca os planos do banco de dados com cache
 * Fallback para valores padrão em caso de erro
 */
async function fetchPlansFromDatabase() {
  try {
    // Verificar se o cache ainda é válido
    if (plansCache && Date.now() - cacheTimestamp < CACHE_TTL) {
      return plansCache;
    }

    const response = await fetch('/api/plans', {
      cache: 'no-store',
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error('Erro ao buscar planos');
    }

    const result = await response.json();

    if (result.success && result.data) {
      // Buscar dados dos planos do banco
      const basicoPlan = result.data.find((p: any) => p.plan_code === 'basico');
      const profissionalPlan = result.data.find((p: any) => p.plan_code === 'profissional');

      // Mapear os dados do banco para o formato esperado
      const plans = {
        basico: {
          // IDs do Stripe vêm do banco agora (fallback para STRIPE_IDS)
          productId: basicoPlan?.stripe_product_id || STRIPE_IDS.basico.productId,
          priceId: basicoPlan?.stripe_price_id || STRIPE_IDS.basico.priceId,
          name: basicoPlan?.name || 'Básico',
          price: parseFloat(basicoPlan?.price || '199'),
          features: {
            max_projects: basicoPlan?.max_projects || 60,
            max_users: basicoPlan?.max_users || 10,
            max_clients: basicoPlan?.max_clients || 100,
            max_storage_gb: basicoPlan?.max_storage_gb || 10,
            api_calls_per_day: basicoPlan?.api_calls_per_day || 2000
          }
        },
        profissional: {
          // IDs do Stripe vêm do banco agora (fallback para STRIPE_IDS)
          productId: profissionalPlan?.stripe_product_id || STRIPE_IDS.profissional.productId,
          priceId: profissionalPlan?.stripe_price_id || STRIPE_IDS.profissional.priceId,
          name: profissionalPlan?.name || 'Profissional',
          price: parseFloat(profissionalPlan?.price || '349'),
          features: {
            max_projects: profissionalPlan?.max_projects || 500,
            max_users: profissionalPlan?.max_users || 50,
            max_clients: profissionalPlan?.max_clients || 1000,
            max_storage_gb: profissionalPlan?.max_storage_gb || 100,
            api_calls_per_day: profissionalPlan?.api_calls_per_day || 10000
          }
        }
      };

      // Atualizar cache
      plansCache = plans;
      cacheTimestamp = Date.now();

      return plans;
    }

    throw new Error('Formato de resposta inválido');

  } catch (error) {
    devLog.error('[Stripe Config] Erro ao buscar planos do banco, usando fallback:', error);

    // Fallback: valores atualizados fixos caso a API falhe
    return {
      basico: {
        productId: STRIPE_IDS.basico.productId,
        priceId: STRIPE_IDS.basico.priceId,
        name: 'Básico',
        price: 199,
        features: {
          max_projects: 60,
          max_users: 10,
          max_clients: 100,
          max_storage_gb: 10,
          api_calls_per_day: 2000
        }
      },
      profissional: {
        productId: STRIPE_IDS.profissional.productId,
        priceId: STRIPE_IDS.profissional.priceId,
        name: 'Profissional',
        price: 349,
        features: {
          max_projects: 500,
          max_users: 50,
          max_clients: 1000,
          max_storage_gb: 100,
          api_calls_per_day: 10000
        }
      }
    };
  }
}

/**
 * Obtém os planos configurados
 * Agora busca do banco de dados com cache e fallback
 */
export async function getStripePlans() {
  return await fetchPlansFromDatabase();
}

// Manter export síncrono para compatibilidade com código legado
// DEPRECADO: Use getStripePlans() assíncrono quando possível
export const STRIPE_PLANS = {
  basico: {
    productId: STRIPE_IDS.basico.productId,
    priceId: STRIPE_IDS.basico.priceId,
    name: 'Básico',
    price: 199, // Valores atualizados como fallback
    features: {
      max_projects: 60,
      max_users: 10,
      max_clients: 100,
      max_storage_gb: 10,
      api_calls_per_day: 2000
    }
  },
  profissional: {
    productId: STRIPE_IDS.profissional.productId,
    priceId: STRIPE_IDS.profissional.priceId,
    name: 'Profissional',
    price: 349, // Valores atualizados como fallback
    features: {
      max_projects: 500,
      max_users: 50,
      max_clients: 1000,
      max_storage_gb: 100,
      api_calls_per_day: 10000
    }
  }
} as const;

export type PlanType = keyof typeof STRIPE_PLANS;

/**
 * Obtém as chaves do Stripe baseado no ambiente
 */
export function getStripeConfig() {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  // Durante o build, permitir que as chaves não estejam configuradas
  if (process.env.NODE_ENV === 'production' && !publishableKey) {
    devLog.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não configurada - funcionalidades do Stripe serão limitadas');
  }
  
  if (process.env.NODE_ENV === 'production' && !secretKey && typeof window === 'undefined') {
    devLog.warn('STRIPE_SECRET_KEY não configurada - funcionalidades do Stripe serão limitadas');
  }
  
  return {
    publishableKey: publishableKey || '',
    secretKey: secretKey || ''
  };
}

/**
 * URL base para redirecionamentos do Stripe
 */
export function getBaseUrl(organizationSlug?: string) {
  if (process.env.NODE_ENV === 'production') {
    // Se temos o slug da organização, usar o domínio correto do tenant
    if (organizationSlug) {
      return `https://${organizationSlug}.gerenciamentofotovoltaico.com.br`;
    }
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://sgf.colmeiasolar.com';
  }
  return 'http://localhost:3000';
}

/**
 * URLs de sucesso e cancelamento para o Stripe Checkout
 * CORREÇÃO: Remover duplicação do tenant no path - o tenant já está no domínio
 */
export function getStripeUrls(organizationSlug: string) {
  const baseUrl = getBaseUrl(organizationSlug);

  return {
    successUrl: `${baseUrl}/admin/assinaturas?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/admin/assinaturas?canceled=true`
  };
}

/**
 * URL universal do webhook para todos os tenants
 * DOMÍNIO DEDICADO SEMPRE ONLINE - Independente das tenants individuais
 * Todos os webhooks são enviados para este endpoint único
 */
export function getWebhookUrl() {
  // Usar domínio dedicado da API - SEMPRE ONLINE para todas as tenants
  const webhookDomain = process.env.STRIPE_WEBHOOK_DOMAIN || 'https://api.gerenciamentofotovoltaico.com.br';
  return `${webhookDomain}/api/webhooks/stripe`;
}
