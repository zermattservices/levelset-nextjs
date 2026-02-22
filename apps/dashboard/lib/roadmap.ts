import { createSupabaseClient } from "@/util/supabase/component";

// Types
export interface RoadmapFeature {
  id: string;
  title: string;
  description: string | null;
  status: 'submitted' | 'idea' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  organization_id?: string | null;
  created_by?: string | null;
  created_by_name?: string | null;
  is_public?: boolean;
  agent_context?: string | null;
}

export interface RoadmapComment {
  id: string;
  feature_id: string;
  content: string;
  author_name: string;
  author_email: string | null;
  created_at: string;
}

export interface RoadmapVote {
  id: string;
  feature_id: string;
  anonymous_token: string;
  vote_type: string;
  created_at: string;
}

export interface RoadmapStats {
  totalFeatures: number;
  totalVotes: number;
  inProgress: number;
}

// Columns to select for public-facing queries (excludes agent_context)
const PUBLIC_COLUMNS = 'id, title, description, status, priority, category, vote_count, comment_count, created_at, updated_at, organization_id, created_by, is_public';

// Supabase queries
export async function fetchFeatures(
  status?: string,
  category?: string,
  sortBy: 'votes' | 'newest' | 'comments' = 'votes',
  searchQuery?: string,
  organizationId?: string,
  userId?: string
): Promise<RoadmapFeature[]> {
  const supabase = createSupabaseClient();
  
  // Build the main query for public features
  let query = supabase
    .from('roadmap_features')
    .select(PUBLIC_COLUMNS)
    .eq('is_public', true)
    .neq('status', 'submitted'); // Exclude submitted status from public view
  
  // Status filter
  if (status === 'active') {
    query = query.in('status', ['idea', 'planned', 'in_progress']);
  } else if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  
  // Category filter
  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  // Organization filter: include public (null) or matching org
  if (organizationId) {
    query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
  }
  
  // Search filter
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }
  
  // Sorting
  if (sortBy === 'votes') {
    query = query.order('vote_count', { ascending: false }).order('created_at', { ascending: false });
  } else if (sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (sortBy === 'comments') {
    query = query.order('comment_count', { ascending: false }).order('created_at', { ascending: false });
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching features:', error);
    return [];
  }
  
  let features = data || [];
  
  // Also fetch the user's own submitted features (pending review)
  if (userId) {
    const { data: userSubmissions, error: userError } = await supabase
      .from('roadmap_features')
      .select(PUBLIC_COLUMNS)
      .eq('created_by', userId)
      .eq('status', 'submitted')
      .order('created_at', { ascending: false });
    
    if (!userError && userSubmissions) {
      // Add user's submissions to the top of the list
      features = [...userSubmissions, ...features];
    }
  }
  
  return features;
}

export async function fetchFeatureById(id: string, organizationId?: string): Promise<RoadmapFeature | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_features')
    .select(PUBLIC_COLUMNS)
    .eq('id', id)
    .or(organizationId ? `is_public.eq.true,organization_id.is.null,organization_id.eq.${organizationId}` : 'is_public.eq.true,organization_id.is.null')
    .single();
  
  if (error) {
    console.error('Error fetching feature:', error);
    return null;
  }
  
  // Fetch creator's name if created_by exists
  let created_by_name: string | null = null;
  if (data.created_by) {
    const { data: userData } = await supabase
      .from('app_users')
      .select('first_name, last_name')
      .eq('auth_user_id', data.created_by)
      .single();
    
    if (userData) {
      created_by_name = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || null;
    }
  }
  
  return {
    ...data,
    created_by_name,
  };
}

export async function fetchStats(organizationId?: string): Promise<RoadmapStats> {
  const supabase = createSupabaseClient();
  
  const [featuresRes, votesRes, progressRes] = await Promise.all([
    supabase
      .from('roadmap_features')
      .select('id', { count: 'exact' })
      .or(organizationId ? `is_public.eq.true,organization_id.is.null,organization_id.eq.${organizationId}` : 'is_public.eq.true,organization_id.is.null'),
    supabase.from('roadmap_votes').select('id', { count: 'exact' }),
    supabase
      .from('roadmap_features')
      .select('id', { count: 'exact' })
      .eq('status', 'in_progress')
      .or(organizationId ? `is_public.eq.true,organization_id.is.null,organization_id.eq.${organizationId}` : 'is_public.eq.true,organization_id.is.null'),
  ]);
  
  return {
    totalFeatures: featuresRes.count || 0,
    totalVotes: votesRes.count || 0,
    inProgress: progressRes.count || 0,
  };
}

export async function fetchUserVotes(): Promise<Set<string>> {
  // deprecated placeholder to avoid breaking existing callers
  return new Set();
}

export async function fetchUserVotesForUser(userId?: string): Promise<Set<string>> {
  if (typeof window === 'undefined' || !userId) return new Set();

  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_votes')
    .select('feature_id')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching votes:', error);
    return new Set();
  }
  
  return new Set(data?.map(v => v.feature_id) || []);
}

export async function toggleVote(featureId: string, hasVoted: boolean, userId?: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  if (!userId) {
    throw new Error('User must be authenticated to vote');
  }
  
  try {
    if (hasVoted) {
      // Remove vote
      const { error } = await supabase
        .from('roadmap_votes')
        .delete()
        .eq('feature_id', featureId)
        .eq('user_id', userId);
      
      if (error) throw error;
      return false; // No longer voted
    } else {
      // Add vote
      const { error } = await supabase
        .from('roadmap_votes')
        .insert({
          feature_id: featureId,
          user_id: userId,
          vote_type: 'upvote',
        });
      
      if (error) throw error;
      return true; // Now voted
    }
  } catch (error) {
    console.error('Error toggling vote:', error);
    throw error;
  }
}

export async function fetchComments(featureId: string): Promise<RoadmapComment[]> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_comments')
    .select('*')
    .eq('feature_id', featureId)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
  
  return data || [];
}

export async function submitComment(
  featureId: string,
  content: string,
  authorName?: string,
  authorEmail?: string
): Promise<RoadmapComment | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_comments')
    .insert({
      feature_id: featureId,
      content: content.trim(),
      author_name: authorName?.trim() || 'Anonymous',
      author_email: authorEmail?.trim() || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error submitting comment:', error);
    return null;
  }
  
  return data;
}

// Utility functions
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  
  if (days > 30) return formatDate(dateString);
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  
  const minutes = Math.floor(diff / 60000);
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  
  return 'Just now';
}

// Status display helpers - matching FormFlow
export const STATUS_CONFIG: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
  submitted: { label: 'Pending Review', bgColor: '#fef3c7', textColor: '#d97706', borderColor: '#fcd34d' },
  idea: { label: 'Idea', bgColor: 'var(--ls-color-muted-soft)', textColor: 'var(--ls-color-neutral)', borderColor: 'var(--ls-color-muted-border)' },
  planned: { label: 'Planned', bgColor: '#fef3c7', textColor: '#92400e', borderColor: '#fcd34d' },
  in_progress: { label: 'In Progress', bgColor: '#dbeafe', textColor: '#1e40af', borderColor: '#93c5fd' },
  completed: { label: 'Complete', bgColor: '#d1fae5', textColor: '#065f46', borderColor: '#6ee7b7' },
  cancelled: { label: 'Cancelled', bgColor: '#f2f2f2', textColor: '#666666', borderColor: '#e5e5e5' },
};

// Priority config - matching FormFlow
export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bgColor: '#fee2e2', textColor: '#dc2626', borderColor: '#fca5a5' },
  high: { label: 'High', bgColor: '#fee2e2', textColor: '#f87171', borderColor: '#fecaca' },
  medium: { label: 'Medium', bgColor: '#ffedd5', textColor: '#ea580c', borderColor: '#fdba74' },
  low: { label: 'Low', bgColor: '#dcfce7', textColor: '#16a34a', borderColor: '#bbf7d0' },
};

// Categories for feature requests
export const CATEGORIES = [
  'Feature',
  'Bug Fix',
  'Improvement',
  'Integration',
  'Performance',
  'UI/UX'
];

// For backward compatibility with existing data
export const CATEGORY_MAP: Record<string, string> = {
  'Dashboard': 'Feature',
  'Mobile': 'Feature',
  'Integrations': 'Integration',
  'Analytics': 'Feature',
  'HR': 'Feature',
  'Feature Requests': 'Feature',
};

// Check if a feature is "popular" (high vote count)
export function isPopular(voteCount: number): boolean {
  return voteCount >= 50;
}

// Submit a new feature request (starts as 'submitted' status for review)
export async function submitFeatureRequest(
  title: string,
  category: string,
  description: string,
  userId: string,
  orgId?: string
): Promise<RoadmapFeature | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_features')
    .insert({
      title: title.trim(),
      description: description.trim(),
      category,
      status: 'submitted',
      priority: 'medium',
      vote_count: 0,
      comment_count: 0,
      is_public: false, // Hidden until approved
      created_by: userId,
      organization_id: orgId || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error submitting feature request:', error);
    return null;
  }
  
  // Automatically vote for the feature the user just submitted
  if (data?.id) {
    try {
      await supabase
        .from('roadmap_votes')
        .insert({
          feature_id: data.id,
          user_id: userId,
          vote_type: 'upvote',
        });
      // Update the returned feature with the vote count
      data.vote_count = 1;
    } catch (voteError) {
      console.error('Error auto-voting for submitted feature:', voteError);
      // Don't fail the whole submission if voting fails
    }
  }
  
  return data;
}

// Fetch all features for admin (includes submitted)
export async function fetchAllFeaturesAdmin(): Promise<RoadmapFeature[]> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_features')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching all features:', error);
    return [];
  }
  
  return data || [];
}

// Update a feature (for admin)
export async function updateFeature(
  featureId: string,
  updates: Partial<Pick<RoadmapFeature, 'title' | 'description' | 'category' | 'status' | 'priority' | 'is_public' | 'created_by' | 'agent_context'>>
): Promise<RoadmapFeature | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_features')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', featureId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating feature:', error);
    return null;
  }
  
  return data;
}

// Approve a feature (set status and make public)
export async function approveFeature(
  featureId: string,
  newStatus: string = 'idea'
): Promise<RoadmapFeature | null> {
  return updateFeature(featureId, {
    status: newStatus as RoadmapFeature['status'],
    is_public: true,
  });
}

// Delete a feature
export async function deleteFeature(featureId: string): Promise<boolean> {
  const supabase = createSupabaseClient();
  
  const { error } = await supabase
    .from('roadmap_features')
    .delete()
    .eq('id', featureId);
  
  if (error) {
    console.error('Error deleting feature:', error);
    return false;
  }
  
  return true;
}

// Create a new feature (for admin)
export async function createFeatureAdmin(
  title: string,
  description: string,
  category: string,
  status: RoadmapFeature['status'],
  priority: RoadmapFeature['priority'],
  createdBy?: string | null,
  agentContext?: string | null
): Promise<RoadmapFeature | null> {
  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from('roadmap_features')
    .insert({
      title: title.trim(),
      description: description.trim(),
      category,
      status,
      priority,
      vote_count: 0,
      comment_count: 0,
      is_public: status !== 'submitted',
      created_by: createdBy || null,
      agent_context: agentContext || null,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating feature:', error);
    return null;
  }
  
  return data;
}

// Fetch all app users for creator dropdown
export interface AppUser {
  id: string;
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

export async function fetchAllUsers(): Promise<AppUser[]> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('app_users')
    .select('id, auth_user_id, first_name, last_name, email')
    .order('first_name', { ascending: true });
  
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data || [];
}
