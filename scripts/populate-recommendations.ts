import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function populateRecommendations(orgId?: string, locationId?: string) {
  console.log('🔄 Generating disciplinary action recommendations...\n');

  try {
    // Fetch all active employees
    let employeesQuery = supabase
      .from('employees')
      .select('*')
      .eq('active', true);
    
    if (orgId) employeesQuery = employeesQuery.eq('org_id', orgId);
    if (locationId) employeesQuery = employeesQuery.eq('location_id', locationId);
    
    const { data: employees, error: empError } = await employeesQuery;
    if (empError) throw empError;
    
    console.log(`📊 Found ${employees.length} active employees\n`);

    // Fetch all discipline action rubrics
    let rubricQuery = supabase
      .from('disc_actions_rubric')
      .select('*')
      .order('points_threshold', { ascending: true });
    
    if (orgId) rubricQuery = rubricQuery.eq('org_id', orgId);
    if (locationId) rubricQuery = rubricQuery.eq('location_id', locationId);
    
    const { data: rubrics, error: rubricError } = await rubricQuery;
    if (rubricError) throw rubricError;
    
    console.log(`📋 Found ${rubrics.length} action thresholds\n`);

    // Calculate 90 days ago
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch infractions from last 90 days
    let infractionsQuery = supabase
      .from('infractions')
      .select('employee_id, points')
      .gte('infraction_date', ninetyDaysAgo);
    
    if (orgId) infractionsQuery = infractionsQuery.eq('org_id', orgId);
    if (locationId) infractionsQuery = infractionsQuery.eq('location_id', locationId);
    
    const { data: infractions, error: infError } = await infractionsQuery;
    if (infError) throw infError;

    // Fetch existing disciplinary actions
    let actionsQuery = supabase
      .from('disc_actions')
      .select('employee_id, action_id, action');
    
    if (orgId) actionsQuery = actionsQuery.eq('org_id', orgId);
    if (locationId) actionsQuery = actionsQuery.eq('location_id', locationId);
    
    const { data: existingActions, error: actionsError } = await actionsQuery;
    if (actionsError) throw actionsError;

    // Clear pending recommendations
    let deleteQuery = supabase
      .from('recommended_disc_actions')
      .delete()
      .is('action_taken', null);
    
    if (orgId) deleteQuery = deleteQuery.eq('org_id', orgId);
    if (locationId) deleteQuery = deleteQuery.eq('location_id', locationId);
    
    await deleteQuery;

    console.log('🧮 Calculating recommendations...\n');

    const recommendationsToInsert = [];
    let recommendationCount = 0;

    for (const employee of employees) {
      // Calculate current points for this employee
      const empInfractions = infractions?.filter(inf => inf.employee_id === employee.id) || [];
      const currentPoints = empInfractions.reduce((sum, inf) => sum + (inf.points || 0), 0);

      // Skip if no points
      if (currentPoints <= 0) continue;

      // Find applicable rubric for this org/location
      const applicableRubrics = rubrics.filter(r => 
        r.org_id === employee.org_id && r.location_id === employee.location_id
      );

      // Find highest threshold crossed
      const crossedThresholds = applicableRubrics
        .filter(r => currentPoints >= r.points_threshold)
        .sort((a, b) => b.points_threshold - a.points_threshold);

      if (crossedThresholds.length === 0) continue;

      const highestThreshold = crossedThresholds[0];

      // Check if action already recorded
      const hasAction = existingActions?.some(action =>
        action.employee_id === employee.id &&
        (action.action_id === highestThreshold.id || action.action === highestThreshold.action)
      );

      if (hasAction) continue;

      // Add to recommendations
      recommendationsToInsert.push({
        employee_id: employee.id,
        org_id: employee.org_id,
        location_id: employee.location_id,
        recommended_action_id: highestThreshold.id,
        recommended_action: highestThreshold.action,
        points_when_recommended: currentPoints,
      });

      recommendationCount++;
      console.log(`  ✓ ${employee.full_name}: ${currentPoints} pts → ${highestThreshold.action}`);
    }

    if (recommendationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('recommended_disc_actions')
        .insert(recommendationsToInsert);

      if (insertError) throw insertError;
    }

    console.log(`\n✨ Generated ${recommendationCount} recommendations!\n`);
    
  } catch (err) {
    console.error('❌ Error:', err);
    throw err;
  }
}

// Parse command line args
const orgId = process.argv[2];
const locationId = process.argv[3];

if (!orgId || !locationId) {
  console.log('Usage: npx tsx scripts/populate-recommendations.ts <org_id> <location_id>');
  console.log('Example: npx tsx scripts/populate-recommendations.ts abc123 def456\n');
}

populateRecommendations(orgId, locationId).then(() => {
  process.exit(0);
}).catch(err => {
  console.error('❌ Failed to generate recommendations');
  process.exit(1);
});

