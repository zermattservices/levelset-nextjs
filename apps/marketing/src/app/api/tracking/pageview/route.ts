import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { visitorId, url, referrer, utmSource, utmMedium, utmCampaign } = body;

    if (!visitorId || !url) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (isRateLimited(visitorId)) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const supabase = createServerSupabaseClient();

    const { error } = await supabase.from('page_views').insert({
      visitor_id: visitorId,
      url,
      referrer: referrer || null,
      utm_source: utmSource || null,
      utm_medium: utmMedium || null,
      utm_campaign: utmCampaign || null,
    });

    if (error) {
      console.error('Page view tracking error:', error);
      return NextResponse.json({ error: 'Failed to track' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
