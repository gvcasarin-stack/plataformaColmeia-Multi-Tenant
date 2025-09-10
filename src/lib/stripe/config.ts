/**
 * Configuração do Stripe para integração de pagamentos
 * Sistema SaaS - SGF Multi-Tenant
 */

// Configuração dos planos disponíveis
export const STRIPE_PLANS = {
  basico: {
    productId: 'prod_SFxl9TpTXNL0YZ',
    priceId: 'price_1RLRppAkIzZurozaQOxPIBAL',
    name: 'Básico',
    price: 299, // R$ 299/mês
    features: {
      max_projects: 30,
      max_users: 10,
      max_clients: 100,
      max_storage_gb: 3,
      api_calls_per_day: 2000
    }
  },
  profissional: {
    productId: 'prod_SFyTYFsmWx4aco', 
    priceId: 'price_1RLSWCAkIzZurozaH6jYWzQW',
    name: 'Profissional',
    price: 399, // R$ 399/mês
    features: {
      max_projects: 100,
      max_users: 25,
      max_clients: 500,
      max_storage_gb: 10,
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
    console.warn('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY não configurada - funcionalidades do Stripe serão limitadas');
  }
  
  if (process.env.NODE_ENV === 'production' && !secretKey && typeof window === 'undefined') {
    console.warn('STRIPE_SECRET_KEY não configurada - funcionalidades do Stripe serão limitadas');
  }
  
  return {
    publishableKey: publishableKey || '',
    secretKey: secretKey || ''
  };
}

/**
 * URL base para redirecionamentos do Stripe
 */
export function getBaseUrl() {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://sgf.colmeiasolar.com';
  }
  return 'http://localhost:3000';
}

/**
 * URLs de sucesso e cancelamento para o Stripe Checkout
 */
export function getStripeUrls(organizationSlug: string) {
  const baseUrl = getBaseUrl();
  
  return {
    successUrl: `${baseUrl}/${organizationSlug}/admin/assinaturas?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${baseUrl}/${organizationSlug}/admin/assinaturas?canceled=true`
  };
}

/**
 * URL universal do webhook para todos os tenants
 * Funciona independente do domínio do tenant
 */
export function getWebhookUrl() {
  // Usar domínio principal da plataforma para webhook
  const webhookDomain = process.env.STRIPE_WEBHOOK_DOMAIN || 'https://sgf.colmeiasolar.com';
  return `${webhookDomain}/api/webhooks/stripe`;
}
