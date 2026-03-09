import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendWaitlistNotification } from '@/lib/resend';
import { notifyLead } from '@levelset/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, operatorName, storeNumber, isMultiUnit, message, source, visitorId } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = operatorName?.trim() || null;

    // Split operatorName into first/last for leads table
    let firstName: string | null = null;
    let lastName: string | null = null;
    if (trimmedName) {
      const parts = trimmedName.split(/\s+/);
      firstName = parts[0] || null;
      lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
    }

    // Upsert into waitlist table (keep for backward compatibility)
    const { error: dbError } = await supabase
      .from('waitlist')
      .upsert(
        {
          email: normalizedEmail,
          operator_name: trimmedName,
          store_number: storeNumber?.trim() || null,
          is_multi_unit: isMultiUnit ?? false,
          message: message?.trim() || null,
          source: source || 'website',
          metadata: {
            submitted_at: new Date().toISOString(),
            user_agent: request.headers.get('user-agent') || null,
          },
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        }
      );

    if (dbError) {
      console.error('Supabase error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save your information. Please try again.' },
        { status: 500 }
      );
    }

    // Upsert into leads table (CRM tracking)
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .upsert(
        {
          email: normalizedEmail,
          first_name: firstName,
          last_name: lastName,
          store_number: storeNumber?.trim() || null,
          is_multi_unit: isMultiUnit ?? false,
          message: message?.trim() || null,
          source: source || 'website',
          visitor_id: visitorId || null,
          metadata: {
            submitted_at: new Date().toISOString(),
            user_agent: request.headers.get('user-agent') || null,
            utm_source: body.utmSource || null,
            utm_medium: body.utmMedium || null,
            utm_campaign: body.utmCampaign || null,
          },
        },
        {
          onConflict: 'email',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (leadError) {
      console.error('Lead creation error:', leadError);
      // Non-blocking — waitlist entry already saved
    }

    // Link existing page views to this lead
    if (lead?.id && visitorId) {
      supabase
        .from('page_views')
        .update({ lead_id: lead.id })
        .eq('visitor_id', visitorId)
        .is('lead_id', null)
        .then(({ error }) => {
          if (error) console.error('Page view linking error:', error);
        });

      // Create form_submit event
      supabase
        .from('lead_events')
        .insert({
          lead_id: lead.id,
          event_type: 'form_submit',
          event_data: {
            source: source || 'website',
            store_number: storeNumber?.trim() || null,
            is_multi_unit: isMultiUnit ?? false,
          },
        })
        .then(({ error }) => {
          if (error) console.error('Lead event creation error:', error);
        });
    }

    // Send notification email (non-blocking — failure doesn't affect response)
    sendWaitlistNotification({
      email: normalizedEmail,
      operatorName: trimmedName,
      storeNumber: storeNumber?.trim(),
      isMultiUnit,
      message: message?.trim(),
      source: source || 'website',
    }).catch((err) => {
      console.error('Email notification error:', err);
    });

    await notifyLead({
      email: normalizedEmail,
      name: trimmedName || undefined,
      source: source || 'website',
      storeNumber: storeNumber?.trim() || undefined,
      isMultiUnit: isMultiUnit ?? undefined,
      message: message?.trim() || undefined,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
