/**
 * POST /api/onboarding/billing-setup
 *
 * Creates a Stripe Customer and Checkout Session in setup mode
 * to collect payment method before the user begins onboarding.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify auth
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

  const email = user.email;
  if (!email) {
    return res.status(400).json({ error: 'User email not found' });
  }

  try {
    const stripe = getStripe();

    // Check if a Stripe customer already exists for this email (idempotent)
    let customerId: string;
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email,
        metadata: { auth_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create Checkout Session in setup mode (collects payment method only, no charge)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'setup',
      payment_method_types: ['card'],
      success_url: `${baseUrl}/onboarding?billing_complete=true`,
      cancel_url: `${baseUrl}/onboarding`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating billing setup session:', err);
    return res.status(500).json({ error: err.message || 'Failed to create billing setup session' });
  }
}
