import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

/**
 * Server-side Stripe client factory.
 * Uses singleton pattern — safe for serverless (Next.js API routes).
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return stripeInstance;
}
