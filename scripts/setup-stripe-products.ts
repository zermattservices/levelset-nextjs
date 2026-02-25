/**
 * Setup Stripe Products & Prices
 *
 * Creates (or finds existing) Stripe products and prices for Levelset subscription tiers.
 * Idempotent — safe to run multiple times.
 *
 * Usage: npx tsx scripts/setup-stripe-products.ts
 *
 * After running, copy the printed STRIPE_PRICE_* values to .env.local
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import Stripe from 'stripe';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

if (!process.env.STRIPE_SECRET_KEY) {
  console.error('❌ Missing STRIPE_SECRET_KEY. Set it in .env.local');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
});

interface TierConfig {
  productName: string;
  description: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  tier: string;
}

const TIERS: TierConfig[] = [
  {
    productName: 'Levelset Core',
    description: 'Essential tools for team management — Dashboard, PEA, Discipline, Roster, Mobile App',
    monthlyPriceCents: 9900,
    annualPriceCents: 8900,
    tier: 'core',
  },
  {
    productName: 'Levelset Pro',
    description: 'Advanced operations — Core + Certifications, OE, Scheduling, Forms, Documents, Multi-Unit',
    monthlyPriceCents: 17900,
    annualPriceCents: 16100,
    tier: 'pro',
  },
  {
    productName: 'Levelset Ultimate',
    description: 'Full platform with AI — Pro + Levi AI assistant with included query allowance',
    monthlyPriceCents: 24900,
    annualPriceCents: 22400,
    tier: 'ultimate',
  },
];

async function findOrCreateProduct(name: string, description: string): Promise<Stripe.Product> {
  // Search for existing product by name
  const existing = await stripe.products.search({
    query: `name:"${name}"`,
  });

  if (existing.data.length > 0) {
    console.log(`  Found existing product: ${name} (${existing.data[0].id})`);
    return existing.data[0];
  }

  const product = await stripe.products.create({
    name,
    description,
    metadata: { created_by: 'setup-stripe-products' },
  });
  console.log(`  Created product: ${name} (${product.id})`);
  return product;
}

async function findOrCreatePrice(
  productId: string,
  unitAmount: number,
  interval: 'month' | 'year',
  nickname: string
): Promise<Stripe.Price> {
  // Search for existing active price with matching amount and interval
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring',
    limit: 100,
  });

  const match = existing.data.find(
    p => p.unit_amount === unitAmount && p.recurring?.interval === interval
  );

  if (match) {
    console.log(`  Found existing price: ${nickname} (${match.id}) — $${unitAmount / 100}/${interval}`);
    return match;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: unitAmount,
    currency: 'usd',
    recurring: {
      interval,
      usage_type: 'licensed',
    },
    nickname,
    metadata: { created_by: 'setup-stripe-products' },
  });
  console.log(`  Created price: ${nickname} (${price.id}) — $${unitAmount / 100}/${interval}`);
  return price;
}

async function findOrCreateMeteredPrice(productId: string): Promise<Stripe.Price | null> {
  // Check for existing metered price
  const existing = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring',
    limit: 100,
  });

  const match = existing.data.find(p => p.recurring?.usage_type === 'metered');

  if (match) {
    console.log(`  Found existing metered price: AI Overage (${match.id})`);
    return match;
  }

  // Newer Stripe API requires a Billing Meter for metered prices.
  // Create or find a meter first.
  try {
    let meter: Stripe.Billing.Meter | undefined;

    // Check for existing meter
    const meters = await stripe.billing.meters.list({ limit: 100 });
    meter = meters.data.find(m => m.event_name === 'levelset_ai_query');

    if (!meter) {
      meter = await stripe.billing.meters.create({
        display_name: 'Levelset AI Queries',
        event_name: 'levelset_ai_query',
        default_aggregation: { formula: 'sum' },
      });
      console.log(`  Created billing meter: ${meter.id}`);
    } else {
      console.log(`  Found existing billing meter: ${meter.id}`);
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: 5, // $0.05 per query
      currency: 'usd',
      recurring: {
        interval: 'month',
        usage_type: 'metered',
        meter: meter.id,
      },
      nickname: 'AI Query Overage',
      metadata: { created_by: 'setup-stripe-products' },
    });
    console.log(`  Created metered price: AI Overage (${price.id}) — $0.05/query`);
    return price;
  } catch (err: any) {
    console.warn(`  ⚠ Skipped metered AI overage price: ${err.message}`);
    console.warn(`  → AI overage tracking uses internal DB. Metered billing can be added later.`);
    return null;
  }
}

async function main() {
  console.log('Setting up Stripe products and prices...\n');

  const envVars: Record<string, string> = {};

  for (const config of TIERS) {
    console.log(`\n${config.productName}:`);

    const product = await findOrCreateProduct(config.productName, config.description);

    // Monthly price
    const monthlyPrice = await findOrCreatePrice(
      product.id,
      config.monthlyPriceCents,
      'month',
      `${config.productName} Monthly`
    );
    envVars[`STRIPE_PRICE_${config.tier.toUpperCase()}_MONTHLY`] = monthlyPrice.id;

    // Annual price (per month equivalent, billed yearly)
    const annualPrice = await findOrCreatePrice(
      product.id,
      config.annualPriceCents * 12, // Annual total
      'year',
      `${config.productName} Annual`
    );
    envVars[`STRIPE_PRICE_${config.tier.toUpperCase()}_ANNUAL`] = annualPrice.id;

    // For Ultimate: add metered AI overage price
    if (config.tier === 'ultimate') {
      const meteredPrice = await findOrCreateMeteredPrice(product.id);
      if (meteredPrice) {
        envVars['STRIPE_PRICE_AI_OVERAGE'] = meteredPrice.id;
      }
    }
  }

  console.log('\n\n=== Add these to your .env.local ===\n');
  for (const [key, value] of Object.entries(envVars)) {
    console.log(`${key}=${value}`);
  }
  console.log('\n=== Done ===');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
