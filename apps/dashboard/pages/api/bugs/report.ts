import { createServerSupabaseClient } from '@/lib/supabase-server';
import { notifyBugReported } from '@levelset/notifications';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createServerSupabaseClient();

  // Verify the user is authenticated
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Get the app_user record for name/email
  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, first_name, last_name, full_name, email, org_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!appUser) {
    return res.status(401).json({ error: 'User not found' });
  }

  const { featureArea, description } = req.body;

  if (!featureArea || typeof featureArea !== 'string') {
    return res.status(400).json({ error: 'Feature area is required' });
  }
  if (!description || typeof description !== 'string' || description.trim().length < 10) {
    return res.status(400).json({ error: 'Description must be at least 10 characters' });
  }

  const trimmedDescription = description.trim();
  const title = `Bug: ${featureArea} — ${trimmedDescription.slice(0, 60)}${trimmedDescription.length > 60 ? '...' : ''}`;

  // Create roadmap_features entry as a bug report
  const { data: feature, error: featureError } = await supabase
    .from('roadmap_features')
    .insert({
      title,
      description: trimmedDescription,
      category: 'Bug Fix',
      status: 'submitted',
      is_public: false,
      created_by: appUser.id,
    })
    .select('id')
    .single();

  if (featureError) {
    console.error('Error creating roadmap feature:', featureError);
    return res.status(500).json({ error: 'Failed to submit bug report' });
  }

  // Create a linked board_tasks entry
  const { error: taskError } = await supabase
    .from('board_tasks')
    .insert({
      title,
      description: trimmedDescription,
      status: 'backlog',
      priority: 'high',
      roadmap_feature_id: feature.id,
    });

  if (taskError) {
    console.error('Error creating board task:', taskError);
    // Non-blocking — the roadmap entry was already created
  }

  // Slack notification (fire-and-forget)
  notifyBugReported({
    featureArea,
    description: trimmedDescription,
    reportedBy: {
      name: appUser.full_name || `${appUser.first_name || ''} ${appUser.last_name || ''}`.trim() || 'Unknown',
      email: appUser.email || user.email || 'unknown',
    },
    roadmapFeatureId: feature.id,
  });

  return res.status(200).json({ id: feature.id });
}
