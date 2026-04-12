/**
 * Utilitário para rastreamento de eventos Meta (Pixel + CAPI dual-fire).
 *
 * Gera um event_id único por disparo, compartilhado entre o pixel client-side
 * e a Conversion API server-side, permitindo deduplicação no painel da Meta.
 */

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
  }
}

function generateEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function sendCAPI(
  eventName: string,
  eventId: string
): Promise<void> {
  try {
    await fetch('/api/meta-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: eventName,
        event_id: eventId,
        event_source_url: window.location.href,
        client_user_agent: navigator.userAgent,
      }),
    });
  } catch {
    // Silently fail — não bloquear UX por erro de rastreamento
  }
}

/**
 * Dispara evento Lead (pixel + CAPI).
 * Usar no clique de "Começar teste grátis".
 */
export function trackLead(): void {
  const eventId = generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Lead', {}, { eventID: eventId });
  }

  sendCAPI('Lead', eventId);
}

/**
 * Dispara evento Contact (pixel + CAPI).
 * Usar no clique de botões de WhatsApp.
 */
export function trackContact(): void {
  const eventId = generateEventId();

  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq('track', 'Contact', {}, { eventID: eventId });
  }

  sendCAPI('Contact', eventId);
}
