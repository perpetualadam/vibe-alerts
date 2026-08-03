import Stripe from 'stripe';
import fs from 'fs';

function readStripeKey() {
  if (process.env.STRIPE_SECRET_KEY?.trim()) {
    return process.env.STRIPE_SECRET_KEY.trim();
  }

  if (fs.existsSync('.env.local')) {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/^STRIPE_SECRET_KEY="([^"]+)"/m)?.[1];
    if (match) return match;
  }

  throw new Error(
    'Set STRIPE_SECRET_KEY in the environment or in .env.local before running this script.'
  );
}

const key = readStripeKey();
const mode = key.startsWith('sk_live_') || key.startsWith('rk_live_') ? 'live' : 'test';
console.log('STRIPE_MODE', mode);

if (mode === 'test' && process.argv.includes('--require-live')) {
  throw new Error('Refusing to run against test keys. Pass a live secret/restricted key.');
}

const stripe = new Stripe(key);

const APP_URL = 'https://vibe-alerts.com';
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_failed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

let product = (await stripe.products.list({ limit: 20, active: true })).data.find(
  (p) => p.name === 'VibeAlerts'
);

if (!product) {
  product = await stripe.products.create({
    name: 'VibeAlerts',
    description: 'Website form submissions routed to Telegram, Email, Slack, and more.',
  });
  console.log('CREATED_PRODUCT', product.id);
} else {
  console.log('EXISTING_PRODUCT', product.id);
}

let price = (
  await stripe.prices.list({ product: product.id, active: true, limit: 20 })
).data.find((p) => p.type === 'recurring' && p.recurring?.interval === 'month');

if (!price) {
  price = await stripe.prices.create({
    product: product.id,
    currency: 'usd',
    unit_amount: 1500,
    recurring: { interval: 'month' },
    nickname: 'VibeAlerts Monthly',
  });
  console.log('CREATED_PRICE', price.id);
} else {
  console.log('EXISTING_PRICE', price.id);
}

const webhookUrl = `${APP_URL}/api/stripe/webhook`;
const webhooks = await stripe.webhookEndpoints.list({ limit: 20 });
let webhook = webhooks.data.find((w) => w.url === webhookUrl);

if (!webhook) {
  webhook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: 'VibeAlerts production billing',
  });
  console.log('CREATED_WEBHOOK', webhook.id);
  console.log('WEBHOOK_SECRET', webhook.secret);
} else {
  console.log('EXISTING_WEBHOOK', webhook.id, webhook.url);
  const updated = await stripe.webhookEndpoints.update(webhook.id, {
    enabled_events: WEBHOOK_EVENTS,
    disabled: false,
  });
  console.log('UPDATED_WEBHOOK_EVENTS', updated.enabled_events.join(', '));
}

const portalConfigs = await stripe.billingPortal.configurations.list({ limit: 1 });
if (!portalConfigs.data.length) {
  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'VibeAlerts manages your subscription',
    },
    features: {
      customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  });
  console.log('CREATED_PORTAL_CONFIG', config.id);
} else {
  console.log('EXISTING_PORTAL_CONFIG', portalConfigs.data[0].id);
}

console.log('STRIPE_PRICE_ID', price.id);
