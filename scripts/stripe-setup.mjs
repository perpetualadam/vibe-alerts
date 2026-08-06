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

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://vibe-alerts.com').replace(/\/$/, '');
const WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_failed',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

const CATALOG = [
  {
    name: 'VibeAlerts Starter',
    description: 'Solo webhook alerts with a monthly allowance.',
    prices: [
      { nickname: 'Starter Monthly', interval: 'month', unit_amount: 900, env: 'STRIPE_PRICE_STARTER_MONTHLY' },
      { nickname: 'Starter Yearly', interval: 'year', unit_amount: 9000, env: 'STRIPE_PRICE_STARTER_YEARLY' },
    ],
  },
  {
    name: 'VibeAlerts Pro',
    description: 'Higher limits, team seats, and usage-based overage.',
    prices: [
      { nickname: 'Pro Monthly', interval: 'month', unit_amount: 1500, env: 'STRIPE_PRICE_PRO_MONTHLY' },
      { nickname: 'Pro Yearly', interval: 'year', unit_amount: 15000, env: 'STRIPE_PRICE_PRO_YEARLY' },
    ],
  },
];

/** @type {Record<string, string>} */
const createdPrices = {};

for (const item of CATALOG) {
  let product = (await stripe.products.list({ limit: 50, active: true })).data.find(
    (p) => p.name === item.name
  );
  if (!product) {
    product = await stripe.products.create({
      name: item.name,
      description: item.description,
    });
    console.log('CREATED_PRODUCT', product.id, item.name);
  } else {
    console.log('EXISTING_PRODUCT', product.id, item.name);
  }

  const existingPrices = await stripe.prices.list({
    product: product.id,
    active: true,
    limit: 20,
  });

  for (const priceDef of item.prices) {
    let price = existingPrices.data.find(
      (p) =>
        p.type === 'recurring' &&
        p.recurring?.interval === priceDef.interval &&
        p.unit_amount === priceDef.unit_amount
    );
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: priceDef.unit_amount,
        recurring: { interval: priceDef.interval },
        nickname: priceDef.nickname,
      });
      console.log('CREATED_PRICE', price.id, priceDef.nickname);
    } else {
      console.log('EXISTING_PRICE', price.id, priceDef.nickname);
    }
    createdPrices[priceDef.env] = price.id;
  }
}

// Legacy alias
createdPrices.STRIPE_PRICE_ID = createdPrices.STRIPE_PRICE_PRO_MONTHLY;

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

const products = Object.values(createdPrices);
const portalConfigs = await stripe.billingPortal.configurations.list({ limit: 5 });
const priceIds = [
  createdPrices.STRIPE_PRICE_STARTER_MONTHLY,
  createdPrices.STRIPE_PRICE_STARTER_YEARLY,
  createdPrices.STRIPE_PRICE_PRO_MONTHLY,
  createdPrices.STRIPE_PRICE_PRO_YEARLY,
].filter(Boolean);

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
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price'],
        proration_behavior: 'create_prorations',
        products: [
          {
            product: (
              await stripe.prices.retrieve(createdPrices.STRIPE_PRICE_STARTER_MONTHLY)
            ).product,
            prices: [
              createdPrices.STRIPE_PRICE_STARTER_MONTHLY,
              createdPrices.STRIPE_PRICE_STARTER_YEARLY,
            ],
          },
          {
            product: (await stripe.prices.retrieve(createdPrices.STRIPE_PRICE_PRO_MONTHLY)).product,
            prices: [
              createdPrices.STRIPE_PRICE_PRO_MONTHLY,
              createdPrices.STRIPE_PRICE_PRO_YEARLY,
            ],
          },
        ],
      },
    },
  });
  console.log('CREATED_PORTAL_CONFIG', config.id);
} else {
  console.log('EXISTING_PORTAL_CONFIG', portalConfigs.data[0].id);
  console.log('NOTE: Update portal products in Stripe Dashboard if upgrading an old config.');
}

console.log('\nAdd these to Vercel / .env.local:');
for (const [envKey, id] of Object.entries(createdPrices)) {
  console.log(`${envKey}=${id}`);
}
void products;
void priceIds;
