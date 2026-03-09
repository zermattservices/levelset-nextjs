import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

// IPs to exclude from analytics (internal traffic)
const EXCLUDED_IPS = [
  '107.193.220.16', // Levelset office
  ...(process.env.EXCLUDED_ANALYTICS_IPS || '').split(',').map((ip) => ip.trim()).filter(Boolean),
];

function getClientIp(request: NextRequest): string | null {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
}

// Simple in-memory rate limiter (per visitor_id, max 60 requests/minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(visitorId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(visitorId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(visitorId, { count: 1, resetAt: now + 60_000 });
    return false;
  }

  entry.count++;
  return entry.count > 60;
}

async function handlePageView(body: any) {
  const { visitorId, sessionId, url, referrer, utmSource, utmMedium, utmCampaign } = body;

  if (!visitorId || !url || !sessionId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (isRateLimited(visitorId)) {
    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  const supabase = createServerSupabaseClient();

  // Insert page view with session_id
  const { data: pageView, error: pvError } = await supabase
    .from('page_views')
    .insert({
      visitor_id: visitorId,
      session_id: sessionId || null,
      url,
      referrer: referrer || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
    })
    .select('id')
    .single();

  if (pvError) {
    console.error('Page view tracking error:', pvError);
    return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
  }

  // Upsert visitor session (create on first view, increment on subsequent)
  if (sessionId) {
    // Try to insert the session first
    const { error: sessionError } = await supabase
      .from('visitor_sessions')
      .upsert(
        {
          visitor_id: visitorId,
          session_id: sessionId,
          entry_page: url,
          exit_page: url,
          referrer: referrer || null,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
          page_count: 1,
          is_bounce: true,
        },
        { onConflict: 'session_id', ignoreDuplicates: true }
      );

    if (sessionError) {
      console.error('Session upsert error:', sessionError);
    }

    // If the session already existed, increment page count
    await supabase.rpc('increment_session_page_count', {
      p_session_id: sessionId,
      p_exit_page: url,
    });
  }

  return NextResponse.json({ success: true, pageViewId: pageView?.id });
}

async function handlePageLeave(body: any) {
  const { pageViewId, timeOnPageSeconds, sessionId, exitPage } = body;

  if (!pageViewId || !timeOnPageSeconds) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  // Update the page view with time on page
  await supabase
    .from('page_views')
    .update({ time_on_page_seconds: timeOnPageSeconds })
    .eq('id', pageViewId);

  // Update session ended_at and duration
  if (sessionId) {
    const { data: session } = await supabase
      .from('visitor_sessions')
      .select('started_at')
      .eq('session_id', sessionId)
      .single();

    if (session) {
      const startedAt = new Date(session.started_at).getTime();
      const duration = Math.round((Date.now() - startedAt) / 1000);

      await supabase
        .from('visitor_sessions')
        .update({
          exit_page: exitPage || null,
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .eq('session_id', sessionId);
    }
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest) {
  try {
    // Skip tracking for excluded IPs (internal traffic)
    const clientIp = getClientIp(request);
    if (clientIp && EXCLUDED_IPS.includes(clientIp)) {
      return NextResponse.json({ success: true, filtered: true });
    }

    const body = await request.json();

    if (body.type === 'page_leave') {
      return handlePageLeave(body);
    }

    return handlePageView(body);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
