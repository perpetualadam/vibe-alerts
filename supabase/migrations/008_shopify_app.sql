-- Shopify App: multi-tenant shop installs, encrypted access tokens, topic prefs

CREATE TABLE IF NOT EXISTS public.shopify_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  shop_domain TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  scope TEXT,
  connected BOOLEAN NOT NULL DEFAULT false,
  enabled_topics TEXT[] NOT NULL DEFAULT ARRAY[
    'orders/create',
    'orders/paid',
    'customers/create',
    'refunds/create'
  ]::TEXT[],
  webhook_ids JSONB NOT NULL DEFAULT '{}'::jsonb,
  installed_at TIMESTAMPTZ,
  uninstalled_at TIMESTAMPTZ,
  last_webhook_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shop_domain),
  UNIQUE (user_id, shop_domain)
);

CREATE INDEX IF NOT EXISTS idx_shopify_shops_user_id
  ON public.shopify_shops(user_id);

CREATE INDEX IF NOT EXISTS idx_shopify_shops_connected
  ON public.shopify_shops(connected)
  WHERE connected = true;

DROP TRIGGER IF EXISTS shopify_shops_updated_at ON public.shopify_shops;
CREATE TRIGGER shopify_shops_updated_at
  BEFORE UPDATE ON public.shopify_shops
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.shopify_shops ENABLE ROW LEVEL SECURITY;
-- Service-role only (encrypted tokens). Dashboard APIs use admin client.

COMMENT ON TABLE public.shopify_shops IS
  'Shopify App installs. access_token_encrypted is AES-256-GCM; service role only.';

-- Idempotency for inbound Shopify webhooks (X-Shopify-Webhook-Id)
CREATE TABLE IF NOT EXISTS public.shopify_webhook_events (
  id TEXT PRIMARY KEY,
  shop_domain TEXT NOT NULL,
  topic TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shopify_webhook_events_processed_at
  ON public.shopify_webhook_events(processed_at DESC);

ALTER TABLE public.shopify_webhook_events ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.shopify_webhook_events IS
  'Processed Shopify webhook IDs for idempotency. Service role only.';
