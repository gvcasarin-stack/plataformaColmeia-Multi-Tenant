/**
 * Cliente Stripe para operações no frontend
 * Sistema SaaS - SGF Multi-Tenant
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { getStripeConfig } from './config';

let stripePromise: Promise<Stripe | null> | null = null;

/**
 * Obtém instância do Stripe para uso no frontend
 */
export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const { publishableKey } = getStripeConfig();
    stripePromise = loadStripe(publishableKey);
  }
  
  return stripePromise;
}

/**
 * Redireciona para o Stripe Checkout
 * @param sessionId - ID da sessão de checkout criada no backend
 */
export async function redirectToCheckout(sessionId: string): Promise<void> {
  const stripe = await getStripe();
  
  if (!stripe) {
    throw new Error('Stripe não foi carregado corretamente');
  }
  
  const { error } = await stripe.redirectToCheckout({
    sessionId
  });
  
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Abre o Stripe Checkout em nova guia
 * @param checkoutUrl - URL completa do checkout do Stripe
 */
export function openStripeCheckoutInNewTab(checkoutUrl: string): void {
  const newWindow = window.open(
    checkoutUrl,
    'stripe-checkout',
    'width=800,height=600,scrollbars=yes,resizable=yes'
  );
  
  if (!newWindow) {
    // Fallback se popup foi bloqueado
    window.open(checkoutUrl, '_blank');
  }
}
