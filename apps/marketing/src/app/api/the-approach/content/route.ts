import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from('the_approach')
      .select('*')
      .eq('active', true)
      .order('timeslot_number');

    if (error) {
      console.error('Failed to fetch timeslot content:', error);
      return NextResponse.json(
        { error: 'Failed to load content' },
        { status: 500 }
      );
    }

    return NextResponse.json({ timeslots: data || [] });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
