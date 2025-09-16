-- Tabela para garantir idempotência no webhook do Stripe
-- Evita processamento duplicado de eventos

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR NOT NULL UNIQUE,
    event_type VARCHAR NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    processed_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índice para busca rápida por event_id
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_event_id
ON stripe_webhook_events(stripe_event_id);

-- Índice para busca por organização
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_org_id
ON stripe_webhook_events(organization_id);