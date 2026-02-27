/**
 * POST /api/onboarding/create-org
 *
 * Creates an org, locations, employees, app_user, Stripe trial subscription,
 * onboarding session, and sends welcome email.
 *
 * Called from Step 1 of the onboarding flow after the user has already
 * signed up via Supabase Auth on /signup.
 *
 * Auth: Bearer token from Supabase Auth session.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getStripe } from '@/lib/stripe';
import { getStripePriceId, TRIAL_DAYS } from '@/lib/billing/constants';
import { syncFeaturesFromTier } from '@/lib/billing/sync-features';
import { sendWelcomeOnboardingEmail } from '@/lib/emails/welcome-onboarding';
import { ROLE_COLOR_KEYS } from '@/lib/role-utils';

interface LocationInput {
  storeNumber: string;
  locationName: string;
  googlePlaceId?: string;
  googleData?: {
    address?: string;
    phone?: string;
    latitude?: number;
    longitude?: number;
    googleMapsUrl?: string;
  };
  googleHoursDisplay?: string[];
  googleRating?: number;
  googleReviewCount?: number;
}

interface CreateOrgRequest {
  firstName: string;
  lastName: string;
  phone: string;
  isOperator: boolean;
  operatorName?: string;
  isMultiUnit: boolean;
  locations: LocationInput[];
}

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

  const authUserId = user.id;
  const email = user.email;

  if (!email) {
    return res.status(400).json({ error: 'User email not found' });
  }

  const body = req.body as CreateOrgRequest;
  const { firstName, lastName, phone, isOperator, operatorName, isMultiUnit, locations } = body;

  // Validate required fields
  if (!firstName || !lastName || !locations || locations.length === 0) {
    return res.status(400).json({ error: 'firstName, lastName, and at least one location are required' });
  }

  if (locations.length > 3) {
    return res.status(400).json({ error: 'Maximum 3 locations allowed' });
  }

  for (const loc of locations) {
    if (!loc.storeNumber || !/^\d{5}$/.test(loc.storeNumber)) {
      return res.status(400).json({ error: `Invalid store number: ${loc.storeNumber}. Must be 5 digits.` });
    }
    if (!loc.locationName) {
      return res.status(400).json({ error: 'Each location must have a name' });
    }
  }

  if (!isOperator && !operatorName) {
    return res.status(400).json({ error: 'operatorName is required when isOperator is false' });
  }

  // Check for duplicate app_user with this auth_user_id
  const { data: existingUser } = await supabase
    .from('app_users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existingUser) {
    return res.status(409).json({ error: 'An account already exists for this user' });
  }

  try {
    const storeNumbers = locations.map(l => l.storeNumber);

    // Check if any of these store numbers are already claimed by another org
    const { data: existingLocations } = await supabase
      .from('locations')
      .select('id, org_id, location_number')
      .in('location_number', storeNumbers);

    if (existingLocations && existingLocations.length > 0) {
      // Check which orgs have real users (not orphaned from failed attempts)
      const orgIds = Array.from(new Set(existingLocations.map(l => l.org_id)));
      const { data: orgUsers } = await supabase
        .from('app_users')
        .select('org_id')
        .in('org_id', orgIds);

      const claimedOrgIds = new Set((orgUsers || []).map(u => u.org_id));
      const claimedLocations = existingLocations.filter(l => claimedOrgIds.has(l.org_id));

      if (claimedLocations.length > 0) {
        const takenNumbers = claimedLocations.map(l => l.location_number).join(', ');
        return res.status(409).json({
          error: `Store number ${takenNumbers} is already registered with another account.`,
        });
      }

      // Remaining locations are orphaned from failed attempts — clean them up
      const orphanedOrgIds = orgIds.filter(id => !claimedOrgIds.has(id));
      for (const orphanedOrgId of orphanedOrgIds) {
        await supabase.from('onboarding_sessions').delete().eq('org_id', orphanedOrgId);
        await supabase.from('employees').delete().eq('org_id', orphanedOrgId);
        await supabase.from('org_roles').delete().eq('org_id', orphanedOrgId);
        await supabase.from('locations').delete().eq('org_id', orphanedOrgId);
        await supabase.from('orgs').delete().eq('id', orphanedOrgId);
      }
    }

    // Look up CFA directory data for each location
    const { data: cfaData } = await supabase
      .from('cfa_location_directory')
      .select('location_number, operator_name, location_type')
      .in('location_number', storeNumbers);

    const cfaMap = new Map(
      (cfaData || []).map(c => [c.location_number, c])
    );

    const fullName = `${firstName} ${lastName}`;
    const resolvedOperatorName = isOperator ? fullName : (operatorName || '');

    // 1. Create org
    const { data: org, error: orgError } = await supabase
      .from('orgs')
      .insert({
        name: locations[0].locationName,
        operator_name: resolvedOperatorName,
        trial_ends_at: new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        is_multi_unit: isMultiUnit,
        onboarding_completed: false,
      })
      .select('id')
      .single();

    if (orgError || !org) {
      console.error('Failed to create org:', orgError);
      return res.status(500).json({ error: `Failed to create organization: ${orgError?.message || 'Unknown error'}` });
    }

    const orgId = org.id;

    // 2. Create locations
    const locationInserts = locations.map(loc => {
      const cfaInfo = cfaMap.get(loc.storeNumber);
      return {
        org_id: orgId,
        name: loc.locationName,
        location_number: loc.storeNumber,
        operator: cfaInfo?.operator_name || resolvedOperatorName,
        location_type: cfaInfo?.location_type || null,
        google_place_id: loc.googlePlaceId || null,
        latitude: loc.googleData?.latitude || null,
        longitude: loc.googleData?.longitude || null,
        google_maps_url: loc.googleData?.googleMapsUrl || null,
        phone: loc.googleData?.phone || null,
        address: loc.googleData?.address || null,
      };
    });

    const { data: createdLocations, error: locError } = await supabase
      .from('locations')
      .insert(locationInserts)
      .select('id, name, location_number');

    if (locError || !createdLocations || createdLocations.length === 0) {
      console.error('Failed to create locations:', locError);
      return res.status(500).json({ error: `Failed to create locations: ${locError?.message || 'Unknown error'}` });
    }

    const primaryLocationId = createdLocations[0].id;

    // 2b. Update locations with Google hours/rating data if confirmed during onboarding
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const created = createdLocations[i];
      if (!created || !loc.googlePlaceId) continue;

      const googleUpdates: Record<string, any> = {};
      if (loc.googleHoursDisplay) googleUpdates.google_hours_display = loc.googleHoursDisplay;
      if (loc.googleRating != null) googleUpdates.google_rating = loc.googleRating;
      if (loc.googleReviewCount != null) googleUpdates.google_review_count = loc.googleReviewCount;
      googleUpdates.google_last_synced_at = new Date().toISOString();

      if (Object.keys(googleUpdates).length > 1) {
        await supabase
          .from('locations')
          .update(googleUpdates)
          .eq('id', created.id);
      }
    }

    // 3. Create employee records
    const employeeInserts: any[] = [];

    if (isOperator) {
      // Signup user is the operator
      employeeInserts.push({
        org_id: orgId,
        location_id: primaryLocationId,
        first_name: firstName,
        last_name: lastName,
        role: 'Operator',
        is_foh: true,
        is_boh: true,
        active: true,
        email,
        phone: phone || null,
      });
    } else {
      // Create operator employee (the named operator)
      const operatorParts = (operatorName || '').trim().split(/\s+/);
      const opFirst = operatorParts[0] || operatorName || '';
      const opLast = operatorParts.slice(1).join(' ') || '';

      employeeInserts.push({
        org_id: orgId,
        location_id: primaryLocationId,
        first_name: opFirst,
        last_name: opLast || null,
        role: 'Operator',
        is_foh: true,
        is_boh: true,
        active: true,
      });

      // Create signup user employee as Director
      employeeInserts.push({
        org_id: orgId,
        location_id: primaryLocationId,
        first_name: firstName,
        last_name: lastName,
        role: 'Director',
        is_foh: true,
        is_boh: true,
        active: true,
        email,
        phone: phone || null,
      });
    }

    const { data: createdEmployees, error: empError } = await supabase
      .from('employees')
      .insert(employeeInserts)
      .select('id, role');

    if (empError || !createdEmployees) {
      console.error('Failed to create employees:', empError);
      return res.status(500).json({ error: `Failed to create employees: ${empError?.message || 'Unknown error'}` });
    }

    // Find the signup user's employee record
    const signupEmployeeRole = isOperator ? 'Operator' : 'Director';
    const signupEmployee = createdEmployees.find(e => e.role === signupEmployeeRole);

    // app_users.role uses different values than employees.role
    const appUserRole = isOperator ? 'Owner/Operator' : 'Director';

    // 4. Create app_user
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        auth_user_id: authUserId,
        org_id: orgId,
        location_id: primaryLocationId,
        role: appUserRole,
        employee_id: signupEmployee?.id || null,
      })
      .select('id')
      .single();

    if (appUserError || !appUser) {
      console.error('Failed to create app_user:', appUserError);
      return res.status(500).json({ error: `Failed to create user record: ${appUserError?.message || 'Unknown error'}` });
    }

    // 5. Create default org_roles (Operator at level 0)
    const defaultRoles = [
      { org_id: orgId, role_name: 'Operator', hierarchy_level: 0, is_leader: true, is_trainer: false, color: ROLE_COLOR_KEYS[0] },
    ];

    await supabase.from('org_roles').insert(defaultRoles);

    // 6. Create Stripe customer + Ultimate trial subscription
    let stripeCustomerId: string | null = null;
    try {
      const stripe = getStripe();

      const customer = await stripe.customers.create({
        name: resolvedOperatorName || fullName,
        email,
        metadata: { org_id: orgId },
      });
      stripeCustomerId = customer.id;

      await supabase
        .from('orgs')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', orgId);

      const priceId = getStripePriceId('pro', 'monthly');

      await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId, quantity: 1 }],
        trial_period_days: TRIAL_DAYS,
        metadata: { org_id: orgId, plan_tier: 'pro' },
      });

      // Sync features for pro tier (webhook may also do this, but sync immediately)
      await syncFeaturesFromTier(supabase, orgId, 'pro');
    } catch (stripeError) {
      // Log but don't fail the whole signup — Stripe can be retried
      console.error('Stripe setup error (non-fatal):', stripeError);
    }

    // 7. Create onboarding session
    const { data: session, error: sessionError } = await supabase
      .from('onboarding_sessions')
      .insert({
        org_id: orgId,
        email,
        current_step: 2, // Step 1 (account setup) is now complete
        completed_steps: [1],
      })
      .select('id, token')
      .single();

    if (sessionError) {
      console.error('Failed to create onboarding session:', sessionError);
    }

    // 8. Send welcome email (non-blocking)
    try {
      await sendWelcomeOnboardingEmail({
        to: email,
        firstName,
        onboardingToken: session?.token || '',
      });
    } catch (emailError) {
      console.error('Failed to send welcome email (non-fatal):', emailError);
    }

    // 9. Fire background Google review sync for locations with place IDs (non-blocking)
    for (let i = 0; i < locations.length; i++) {
      const loc = locations[i];
      const created = createdLocations[i];
      if (!created || !loc.googlePlaceId) continue;

      // Fire-and-forget: sync place details + reviews in background
      // Uses the existing sync library which handles hours, reviews, Yelp matching
      try {
        const { syncPlaceDetailsFromGoogle } = await import('@/lib/google-places');
        syncPlaceDetailsFromGoogle(supabase, created.id, loc.googlePlaceId, orgId).catch((err: any) => {
          console.error(`Background Google sync failed for location ${created.id}:`, err);
        });
      } catch (importErr) {
        console.error('Failed to import google-places sync (non-fatal):', importErr);
      }
    }

    return res.status(200).json({
      success: true,
      orgId,
      locations: createdLocations,
      sessionToken: session?.token || null,
      appUserId: appUser.id,
    });
  } catch (err: any) {
    console.error('create-org error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
