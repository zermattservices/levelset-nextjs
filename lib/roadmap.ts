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
  sortBy: 'votes' | 'newest' | 'oldest' = 'votes',
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
  } else {
    query = query.order('created_at', { ascending: true });
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

// Status display helpers
export const STATUS_CONFIG = {
  idea: { label: 'Idea', bgColor: '#e8f4fd', textColor: '#0066cc' },
  planned: { label: 'Planned', bgColor: '#fff3e0', textColor: '#e65100' },
  in_progress: { label: 'In Progress', bgColor: '#e8f5e9', textColor: '#2e7d32' },
  completed: { label: 'Completed', bgColor: '#f3e5f5', textColor: '#7b1fa2' },
  cancelled: { label: 'Cancelled', bgColor: '#f2f2f2', textColor: '#666666' },
};

export const PRIORITY_CONFIG = {
  critical: { label: 'Critical', bgColor: '#ffebee', textColor: '#c62828', icon: '🔥' },
  high: { label: 'High Priority', bgColor: '#fff8e1', textColor: '#f57f17', icon: null },
  medium: { label: 'Medium', bgColor: '#f2f2f2', textColor: '#666666', icon: null },
  low: { label: 'Low', bgColor: '#f2f2f2', textColor: '#666666', icon: null },
};

export const CATEGORIES = ['Dashboard', 'Mobile', 'Integrations', 'Analytics', 'HR'];
