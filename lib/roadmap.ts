import { createSupabaseClient } from "@/util/supabase/component";

// Types
export interface RoadmapFeature {
  id: string;
  title: string;
  description: string | null;
  status: 'idea' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
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

// Anonymous token management
export function getAnonymousToken(): string {
  if (typeof window === 'undefined') return 'server-render';
  
  let token = localStorage.getItem('roadmap_token');
  if (!token) {
    token = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('roadmap_token', token);
  }
  return token;
}

// Supabase queries
export async function fetchFeatures(
  status?: string,
  category?: string,
  sortBy: 'votes' | 'newest' | 'comments' = 'votes',
  searchQuery?: string
): Promise<RoadmapFeature[]> {
  const supabase = createSupabaseClient();
  
  let query = supabase
    .from('roadmap_features')
    .select('*')
    .eq('is_public', true);
  
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
  
  return data || [];
}

export async function fetchFeatureById(id: string): Promise<RoadmapFeature | null> {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from('roadmap_features')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();
  
  if (error) {
    console.error('Error fetching feature:', error);
    return null;
  }
  
  return data;
}

export async function fetchStats(): Promise<RoadmapStats> {
  const supabase = createSupabaseClient();
  
  const [featuresRes, votesRes, progressRes] = await Promise.all([
    supabase.from('roadmap_features').select('id', { count: 'exact' }).eq('is_public', true),
    supabase.from('roadmap_votes').select('id', { count: 'exact' }),
    supabase.from('roadmap_features').select('id', { count: 'exact' }).eq('status', 'in_progress').eq('is_public', true),
  ]);
  
  return {
    totalFeatures: featuresRes.count || 0,
    totalVotes: votesRes.count || 0,
    inProgress: progressRes.count || 0,
  };
}

export async function fetchUserVotes(): Promise<Set<string>> {
  if (typeof window === 'undefined') return new Set();
  
  const supabase = createSupabaseClient();
  const token = getAnonymousToken();
  
  const { data, error } = await supabase
    .from('roadmap_votes')
    .select('feature_id')
    .eq('anonymous_token', token);
  
  if (error) {
    console.error('Error fetching votes:', error);
    return new Set();
  }
  
  return new Set(data?.map(v => v.feature_id) || []);
}

export async function toggleVote(featureId: string, hasVoted: boolean): Promise<boolean> {
  const supabase = createSupabaseClient();
  const token = getAnonymousToken();
  
  try {
    if (hasVoted) {
      // Remove vote
      const { error } = await supabase
        .from('roadmap_votes')
        .delete()
        .eq('feature_id', featureId)
        .eq('anonymous_token', token);
      
      if (error) throw error;
      return false; // No longer voted
    } else {
      // Add vote
      const { error } = await supabase
        .from('roadmap_votes')
        .insert({
          feature_id: featureId,
          anonymous_token: token,
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
export const STATUS_CONFIG = {
  idea: { label: 'Idea', bgColor: '#f3f4f6', textColor: '#374151', borderColor: '#e5e7eb' },
  planned: { label: 'Planned', bgColor: '#fef3c7', textColor: '#92400e', borderColor: '#fcd34d' },
  in_progress: { label: 'In Progress', bgColor: '#dbeafe', textColor: '#1e40af', borderColor: '#93c5fd' },
  completed: { label: 'Complete', bgColor: '#d1fae5', textColor: '#065f46', borderColor: '#6ee7b7' },
  cancelled: { label: 'Cancelled', bgColor: '#f2f2f2', textColor: '#666666', borderColor: '#e5e5e5' },
};

// Priority config - matching FormFlow
export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bgColor: '#fee2e2', textColor: '#dc2626', borderColor: '#fca5a5' },
  high: { label: 'High Priority', bgColor: '#ffedd5', textColor: '#ea580c', borderColor: '#fdba74' },
  medium: { label: 'Medium', bgColor: '#f3f4f6', textColor: '#6b7280', borderColor: '#e5e7eb' },
  low: { label: 'Low', bgColor: '#f3f4f6', textColor: '#9ca3af', borderColor: '#e5e7eb' },
};

// Categories matching FormFlow
export const CATEGORIES = [
  'Feature',
  'Improvement', 
  'Bug Fix',
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
