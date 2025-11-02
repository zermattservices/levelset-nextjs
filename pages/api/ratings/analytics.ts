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

    if (!orgId || !locationId || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Parse filter params
    const filters: Array<{ field: string; operator: string; value: string }> = [];
    Object.keys(req.query).forEach(key => {
      if (key.startsWith('filter_') && key.endsWith('_field')) {
        const index = key.split('_')[1];
        const field = req.query[`filter_${index}_field`] as string;
        const operator = req.query[`filter_${index}_operator`] as string;
        const value = req.query[`filter_${index}_value`] as string;
        if (field && operator && value) {
          filters.push({ field, operator, value });
        }
      }
    });

    // Build query
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
      .gte('created_at', startDate as string)
      .lte('created_at', endDate as string);

    // Apply FOH/BOH filter
    const isFOH = showFOH === 'true';
    const isBOH = showBOH === 'true';
    
    if (isFOH && !isBOH) {
      query = query.in('position', FOH_POSITIONS);
    } else if (isBOH && !isFOH) {
      query = query.in('position', BOH_POSITIONS);
    }

    const { data: ratings, error } = await query;

    if (error) {
      console.error('Error fetching ratings:', error);
      return res.status(500).json({ error: 'Failed to fetch ratings' });
    }

    if (!ratings) {
      return res.status(200).json({
        current: { count: 0, avgRating: 0, ratingsPerDay: 0 },
        prior: null,
      });
    }

    // Apply client-side filters (search, employee, leader, role, position)
    let filteredRatings = ratings;

    // Search filter
    if (searchText) {
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
    }

    // Grid filter model filters
    filters.forEach(filter => {
      if (!filter.value) return; // Skip if no value

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
    const count = filteredRatings.length;
    const totalRating = filteredRatings.reduce((sum: number, r: any) => sum + (r.rating_avg || 0), 0);
    const avgRating = count > 0 ? totalRating / count : 0;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const ratingsPerDay = count > 0 ? count / days : 0;

    // Fetch PRIOR period data (same length, ending at current start date)
    let priorMetrics = null;

    try {
      const priorEnd = new Date(start);
      const priorStart = new Date(start);
      priorStart.setDate(priorStart.getDate() - days);

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

      const { data: priorRatings, error: priorError } = await priorQuery;

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
      console.error('Error fetching prior period data:', priorError);
      // priorMetrics remains null, will show "% --" and "+0"
    }

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

