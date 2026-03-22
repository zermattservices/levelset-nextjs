import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getResendClient } from '@/lib/resend';
import { notifyLead } from '@levelset/notifications';

interface SubmitBody {
  first_name: string;
  last_name: string;
  email: string;
  is_operator: boolean;
  role: string;
  is_multi_unit: boolean;
  store_numbers: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitBody = await request.json();

    // Validate required fields
    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (!body.store_numbers?.length || !body.store_numbers[0]?.trim()) {
      return NextResponse.json({ error: 'At least one store number is required.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Enrich store numbers from CFA directory
    const enrichedLocations = [];
    for (const storeNum of body.store_numbers) {
      const cleaned = storeNum.trim();
      if (!cleaned) continue;

      const { data: matches } = await supabase
        .from('cfa_location_directory')
        .select('location_name, location_number, operator_name, state')
        .eq('location_number', cleaned)
        .limit(1);

      const match = matches?.[0];
      enrichedLocations.push({
        store_number: cleaned,
        location_name: match?.location_name || null,
        operator_name: match?.operator_name || null,
        state: match?.state || null,
      });
    }

    // Upsert lead (keyed on email + source — allows corrections within same source)
    const { error: dbError } = await supabase
      .from('leads')
      .upsert(
        {
          source: 'demo_request',
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          email: body.email.trim().toLowerCase(),
          is_operator: body.is_operator ?? false,
          role: body.role?.trim() || null,
          is_multi_unit: body.is_multi_unit ?? false,
          locations: enrichedLocations,
          metadata: {},
          updated_at: new Date().toISOString(),
          email_sent: false,
        },
        { onConflict: 'email,source' }
      );

    if (dbError) {
      console.error('leads upsert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save. Please try again.' },
        { status: 500 }
      );
    }

    // Send confirmation email (non-blocking)
    sendConfirmationEmail(body).catch((err) => {
      console.error('Demo request confirmation email error:', err);
    });

    // Send internal notification (non-blocking)
    sendInternalNotification(body, enrichedLocations).catch((err) => {
      console.error('Demo request internal notification error:', err);
    });

    await notifyLead({
      email: body.email.trim().toLowerCase(),
      name: `${body.first_name.trim()} ${body.last_name.trim()}`,
      source: 'demo_request',
      isOperator: body.is_operator,
      role: body.role?.trim() || undefined,
      isMultiUnit: body.is_multi_unit,
      locations: enrichedLocations.map((l) => ({
        store_number: l.store_number,
        location_name: l.location_name || undefined,
        state: l.state || undefined,
      })),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(body: SubmitBody) {
  const resend = getResendClient();

  await resend.emails.send({
    from: 'Andrew at Levelset <andrew@levelset.io>',
    to: [body.email.trim().toLowerCase()],
    subject: 'Thanks for your interest in Levelset!',
    text: [
      `Hey ${body.first_name.trim()}!`,
      '',
      `Thanks for requesting a demo of Levelset. We'll be in touch shortly to get something on the calendar.`,
      '',
      `In the meantime, you can learn more about Levelset at https://levelset.io`,
      '',
      `Talk soon,`,
      `Andrew Dyar`,
      `Founder, Levelset`,
    ].join('\n'),
  });

  // Mark email as sent
  const supabase = createServerSupabaseClient();
  await supabase
    .from('leads')
    .update({ email_sent: true })
    .eq('email', body.email.trim().toLowerCase())
    .eq('source', 'demo_request');
}

async function sendInternalNotification(
  body: SubmitBody,
  locations: Array<{ store_number: string; location_name: string | null; state: string | null }>
) {
  const resend = getResendClient();

  const locationLines = locations
    .map((l) => `  #${l.store_number}${l.location_name ? ` — ${l.location_name}` : ''}${l.state ? ` (${l.state})` : ''}`)
    .join('\n');

  await resend.emails.send({
    from: 'Levelset <notifications@levelset.io>',
    to: ['team@levelset.io'],
    subject: `New demo request: ${body.first_name} ${body.last_name}`,
    text: [
      `New demo request from the marketing site:`,
      '',
      `Name: ${body.first_name} ${body.last_name}`,
      `Email: ${body.email}`,
      `Operator: ${body.is_operator ? 'Yes' : 'No'}`,
      `Role: ${body.role || 'Not specified'}`,
      `Multi-unit: ${body.is_multi_unit ? 'Yes' : 'No'}`,
      `Locations:`,
      locationLines,
      '',
      `Submitted: ${new Date().toISOString()}`,
    ].join('\n'),
  });
}
