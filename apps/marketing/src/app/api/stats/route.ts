import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
      .from('ratings')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching ratings count:', error);
      return NextResponse.json({ ratingsCount: 0 }, { status: 500 });
    }

    return NextResponse.json(
      { ratingsCount: count ?? 0 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (err) {
    console.error('Stats API error:', err);
    return NextResponse.json({ ratingsCount: 0 }, { status: 500 });
  }
}
