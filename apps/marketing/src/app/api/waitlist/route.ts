import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { sendWaitlistNotification } from '@/lib/resend';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, operatorName, storeNumber, isMultiUnit, message, source } = body;

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();

    // Upsert into waitlist table (update if email already exists)
    const { error: dbError } = await supabase
      .from('waitlist')
      .upsert(
        {
          email: email.trim().toLowerCase(),
          operator_name: operatorName?.trim() || null,
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

    // Send notification email (non-blocking — failure doesn't affect response)
    sendWaitlistNotification({
      email: email.trim().toLowerCase(),
      operatorName: operatorName?.trim(),
      storeNumber: storeNumber?.trim(),
      isMultiUnit,
      message: message?.trim(),
      source: source || 'website',
    }).catch((err) => {
      console.error('Email notification error:', err);
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
