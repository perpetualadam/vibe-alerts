-- Multi-tenant WhatsApp Business Cloud API connections
-- Each customer stores their own WABA credentials. Access tokens are encrypted
-- at the application layer (AES-256-GCM) before insert. Service role only.

CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  waba_id TEXT NOT NULL,
  phone_number_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  connected BOOLEAN NOT NULL DEFAULT false,
  display_phone_number TEXT,
  verified_name TEXT,
  last_successful_message_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  disconnected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_user_id
  ON public.whatsapp_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_connected
  ON public.whatsapp_connections(connected)
  WHERE connected = true;

DROP TRIGGER IF EXISTS whatsapp_connections_updated_at ON public.whatsapp_connections;
CREATE TRIGGER whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
-- No authenticated-user policies: access tokens must only be read/written
-- via service-role API routes that redact secrets before responding.

COMMENT ON TABLE public.whatsapp_connections IS
  'Per-tenant WhatsApp Business Cloud API credentials. access_token_encrypted is app-layer AES-256-GCM; service role only.';

COMMENT ON COLUMN public.whatsapp_connections.waba_id IS
  'WhatsApp Business Account ID from Meta Business Manager';

COMMENT ON COLUMN public.whatsapp_connections.phone_number_id IS
  'Cloud API Phone Number ID used as the Graph API messages path segment';

COMMENT ON COLUMN public.whatsapp_connections.access_token_encrypted IS
  'AES-256-GCM ciphertext (iv:tag:ciphertext base64) of the permanent or long-lived access token';
