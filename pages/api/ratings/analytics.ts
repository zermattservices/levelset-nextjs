import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

// Position lists for FOH/BOH filtering
const FOH_POSITIONS = [
  'iPOS',
  'Host',
  'OMD',
  'Runner',
  'Bagging',
  'Drinks 1/3',
  'Drinks 2',
  '3H Week',
  'Trainer',
  'Leadership'
];

const BOH_POSITIONS = [
  'Breader',
  'Secondary',
  'Fries',
  'Primary',
  'Machines',
  'Prep',
  '3H Week',
  'Trainer',
  'Leadership'
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      orgId,
      locationId,
      startDate,
      endDate,
      showFOH,
      showBOH,
      searchText,
    } = req.query;

    console.log('[Analytics API] Request params:', { orgId, locationId, startDate, endDate, showFOH, showBOH, searchText });

    if (!orgId || !locationId || !startDate || !endDate) {
      console.error('[Analytics API] Missing required parameters');
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Validate dates
    const startDateObj = new Date(startDate as string);
    const endDateObj = new Date(endDate as string);
    
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) {
      console.error('[Analytics API] Invalid dates:', { startDate, endDate });
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // Parse filter params safely
    const filters: Array<{ field: string; operator: string; value: string }> = [];
    try {
      Object.keys(req.query).forEach(key => {
        if (key.startsWith('filter_') && key.endsWith('_field')) {
          const parts = key.split('_');
          if (parts.length >= 2) {
            const index = parts[1];
            const field = req.query[`filter_${index}_field`] as string;
            const operator = req.query[`filter_${index}_operator`] as string;
            const value = req.query[`filter_${index}_value`] as string;
            if (field && operator && value) {
              filters.push({ field, operator, value });
            }
          }
        }
      });
      console.log('[Analytics API] Parsed filters:', filters);
    } catch (filterError) {
      console.error('[Analytics API] Error parsing filters:', filterError);
      // Continue without filters if parsing fails
    }

    // Build query
    console.log('[Analytics API] Building query...');
    let query = supabase
      .from('ratings')
      .select(`
        id,
        rating_avg,
        position,
        employees:employees!ratings_employee_id_fkey(id, full_name, first_name, last_name, role),
        rater:employees!ratings_rater_user_id_fkey(id, full_name, first_name, last_name)
      `)
      .eq('org_id', orgId as string)
      .eq('location_id', locationId as string)
      .gte('created_at', startDateObj.toISOString())
      .lte('created_at', endDateObj.toISOString());

    // Apply FOH/BOH filter
    const isFOH = showFOH === 'true';
    const isBOH = showBOH === 'true';
    
    console.log('[Analytics API] FOH/BOH filter:', { isFOH, isBOH });
    
    if (isFOH && !isBOH) {
      query = query.in('position', FOH_POSITIONS);
    } else if (isBOH && !isFOH) {
      query = query.in('position', BOH_POSITIONS);
    }

    console.log('[Analytics API] Executing query...');
    const { data: ratings, error } = await query;

    if (error) {
      console.error('[Analytics API] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch ratings', details: error.message });
    }

    console.log('[Analytics API] Query returned', ratings?.length || 0, 'ratings');

    if (!ratings) {
      return res.status(200).json({
        current: { count: 0, avgRating: 0, ratingsPerDay: 0 },
        prior: null,
      });
    }

    // Apply client-side filters (search, employee, leader, role, position)
    console.log('[Analytics API] Applying client-side filters...');
    let filteredRatings = ratings;

    // Search filter
    if (searchText) {
      console.log('[Analytics API] Applying search filter:', searchText);
      const searchLower = (searchText as string).toLowerCase();
      filteredRatings = filteredRatings.filter((r: any) => {
        const employeeName = r.employees?.full_name || '';
        const raterName = r.rater?.full_name || '';
        const role = r.employees?.role || '';
        const position = r.position || '';
        
        return (
          employeeName.toLowerCase().includes(searchLower) ||
          raterName.toLowerCase().includes(searchLower) ||
          role.toLowerCase().includes(searchLower) ||
          position.toLowerCase().includes(searchLower)
        );
      });
      console.log('[Analytics API] After search filter:', filteredRatings.length, 'ratings');
    }

    // Grid filter model filters
    console.log('[Analytics API] Applying', filters.length, 'grid filters');
    filters.forEach((filter, idx) => {
      if (!filter.value) return; // Skip if no value
      console.log(`[Analytics API] Applying filter ${idx}:`, filter);

      if (filter.field === 'employee_name') {
        if (filter.operator === 'is') {
          filteredRatings = filteredRatings.filter((r: any) => r.employees?.full_name === filter.value);
        } else if (filter.operator === 'isNot') {
          filteredRatings = filteredRatings.filter((r: any) => r.employees?.full_name !== filter.value);
        } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
          const values = filter.value.split(',');
          filteredRatings = filteredRatings.filter((r: any) => values.includes(r.employees?.full_name || ''));
        }
      }
      
      if (filter.field === 'rater_name') {
        if (filter.operator === 'is') {
          filteredRatings = filteredRatings.filter((r: any) => r.rater?.full_name === filter.value);
        } else if (filter.operator === 'isNot') {
          filteredRatings = filteredRatings.filter((r: any) => r.rater?.full_name !== filter.value);
        } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
          const values = filter.value.split(',');
          filteredRatings = filteredRatings.filter((r: any) => values.includes(r.rater?.full_name || ''));
        }
      }
      
      if (filter.field === 'employee_role') {
        if (filter.operator === 'is') {
          filteredRatings = filteredRatings.filter((r: any) => r.employees?.role === filter.value);
        } else if (filter.operator === 'isNot') {
          filteredRatings = filteredRatings.filter((r: any) => r.employees?.role !== filter.value);
        } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
          const values = filter.value.split(',');
          filteredRatings = filteredRatings.filter((r: any) => values.includes(r.employees?.role || ''));
        }
      }
      
      if (filter.field === 'position_cleaned') {
        if (filter.operator === 'is') {
          filteredRatings = filteredRatings.filter((r: any) => r.position === filter.value);
        } else if (filter.operator === 'isNot') {
          filteredRatings = filteredRatings.filter((r: any) => r.position !== filter.value);
        } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
          const values = filter.value.split(',');
          filteredRatings = filteredRatings.filter((r: any) => values.includes(r.position || ''));
        }
      }
    });

    // Calculate current period metrics
    console.log('[Analytics API] Calculating current period metrics...');
    console.log('[Analytics API] Filtered ratings count:', filteredRatings.length);
    
    const count = filteredRatings.length;
    const totalRating = filteredRatings.reduce((sum: number, r: any) => sum + (r.rating_avg || 0), 0);
    const avgRating = count > 0 ? totalRating / count : 0;

    const days = Math.ceil((endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    const ratingsPerDay = count > 0 ? count / days : 0;

    console.log('[Analytics API] Current metrics:', { count, avgRating, ratingsPerDay, days });

    // Fetch PRIOR period data (same length, ending at current start date)
    console.log('[Analytics API] Fetching prior period data...');
    let priorMetrics = null;

    try {
      const priorEnd = new Date(startDateObj);
      const priorStart = new Date(startDateObj);
      priorStart.setDate(priorStart.getDate() - days);
      
      console.log('[Analytics API] Prior period range:', { 
        priorStart: priorStart.toISOString(), 
        priorEnd: priorEnd.toISOString(),
        days 
      });

      let priorQuery = supabase
        .from('ratings')
        .select(`
          id,
          rating_avg,
          position,
          employees:employees!ratings_employee_id_fkey(id, full_name, first_name, last_name, role),
          rater:employees!ratings_rater_user_id_fkey(id, full_name, first_name, last_name)
        `)
        .eq('org_id', orgId as string)
        .eq('location_id', locationId as string)
        .gte('created_at', priorStart.toISOString())
        .lt('created_at', priorEnd.toISOString());

      // Apply same FOH/BOH filter
      if (isFOH && !isBOH) {
        priorQuery = priorQuery.in('position', FOH_POSITIONS);
      } else if (isBOH && !isFOH) {
        priorQuery = priorQuery.in('position', BOH_POSITIONS);
      }

      console.log('[Analytics API] Executing prior period query...');
      const { data: priorRatings, error: priorError } = await priorQuery;

      if (priorError) {
        console.error('[Analytics API] Prior period query error:', priorError);
      } else {
        console.log('[Analytics API] Prior period query returned', priorRatings?.length || 0, 'ratings');
      }

      if (!priorError && priorRatings) {
      // Apply same client-side filters to prior data
      let filteredPriorRatings = priorRatings;

      // Search filter
      if (searchText) {
        const searchLower = (searchText as string).toLowerCase();
        filteredPriorRatings = filteredPriorRatings.filter((r: any) => {
          const employeeName = r.employees?.full_name || '';
          const raterName = r.rater?.full_name || '';
          const role = r.employees?.role || '';
          const position = r.position || '';
          
          return (
            employeeName.toLowerCase().includes(searchLower) ||
            raterName.toLowerCase().includes(searchLower) ||
            role.toLowerCase().includes(searchLower) ||
            position.toLowerCase().includes(searchLower)
          );
        });
      }

      // Grid filter model filters
      filters.forEach(filter => {
        if (!filter.value) return; // Skip if no value

        if (filter.field === 'employee_name') {
          if (filter.operator === 'is') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.employees?.full_name === filter.value);
          } else if (filter.operator === 'isNot') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.employees?.full_name !== filter.value);
          } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
            const values = filter.value.split(',');
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => values.includes(r.employees?.full_name || ''));
          }
        }
        
        if (filter.field === 'rater_name') {
          if (filter.operator === 'is') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.rater?.full_name === filter.value);
          } else if (filter.operator === 'isNot') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.rater?.full_name !== filter.value);
          } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
            const values = filter.value.split(',');
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => values.includes(r.rater?.full_name || ''));
          }
        }
        
        if (filter.field === 'employee_role') {
          if (filter.operator === 'is') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.employees?.role === filter.value);
          } else if (filter.operator === 'isNot') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.employees?.role !== filter.value);
          } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
            const values = filter.value.split(',');
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => values.includes(r.employees?.role || ''));
          }
        }
        
        if (filter.field === 'position_cleaned') {
          if (filter.operator === 'is') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.position === filter.value);
          } else if (filter.operator === 'isNot') {
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => r.position !== filter.value);
          } else if (filter.operator === 'isAnyOf' && typeof filter.value === 'string') {
            const values = filter.value.split(',');
            filteredPriorRatings = filteredPriorRatings.filter((r: any) => values.includes(r.position || ''));
          }
        }
      });

      const priorCount = filteredPriorRatings.length;
      const priorTotalRating = filteredPriorRatings.reduce((sum: number, r: any) => sum + (r.rating_avg || 0), 0);
      const priorAvgRating = priorCount > 0 ? priorTotalRating / priorCount : 0;
      const priorRatingsPerDay = priorCount > 0 ? priorCount / days : 0;

      priorMetrics = {
        count: priorCount,
        avgRating: priorAvgRating,
        ratingsPerDay: priorRatingsPerDay,
      };
      }
    } catch (priorError) {
      console.error('[Analytics API] Error fetching prior period data:', priorError);
      // priorMetrics remains null, will show "% --" and "+0"
    }

    console.log('[Analytics API] Returning response:', {
      current: { count, avgRating, ratingsPerDay },
      prior: priorMetrics
    });

    return res.status(200).json({
      current: {
        count,
        avgRating,
        ratingsPerDay,
      },
      prior: priorMetrics,
    });
  } catch (error) {
    console.error('Error in analytics API:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

