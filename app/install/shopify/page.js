import Link from 'next/link';
import { SITE } from '@/lib/seo/site';

export const metadata = {
  title: `Install Shopify App | ${SITE.name}`,
  description:
    'Connect your Shopify store to VibeAlerts with one-click OAuth. Automatic webhook subscriptions for orders, customers, refunds, and abandoned carts.',
};

/**
 * App Store / Partner landing — merchants arrive with ?shop= from Shopify.
 * Continues to OAuth (login required) at /api/shopify/auth.
 */
export default async function InstallShopifyPage({ searchParams }) {
  const params = await searchParams;
  const shop = typeof params?.shop === 'string' ? params.shop : '';
  const authHref = shop
    ? `/api/shopify/auth?shop=${encodeURIComponent(shop)}`
    : '/dashboard';

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full glass rounded-2xl p-8 space-y-6 text-center">
        <p className="text-sm font-semibold tracking-wide text-vibe-accent">{SITE.name}</p>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Install the Shopify App
        </h1>
        <p className="text-sm text-vibe-muted leading-relaxed">
          Connect your store with OAuth. VibeAlerts subscribes to Shopify webhooks automatically —
          pick which events (orders, customers, refunds, abandoned carts) trigger your notification
          channels.
        </p>
        {shop ? (
          <p className="text-xs font-mono text-vibe-muted break-all">Shop: {shop}</p>
        ) : (
          <p className="text-xs text-vibe-muted">
            Open this page from the Shopify App Store, or install from your VibeAlerts dashboard
            with your <span className="font-mono">*.myshopify.com</span> domain.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            href={authHref}
            className="px-5 py-2.5 rounded-lg bg-vibe-accent hover:bg-vibe-accent-hover text-white text-sm font-medium"
          >
            {shop ? 'Continue to Shopify' : 'Open dashboard'}
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg border border-vibe-border hover:bg-white/5 text-sm"
          >
            Sign in first
          </Link>
        </div>
      </div>
    </main>
  );
}
