import React, { useState, useEffect, useCallback } from 'react';
import {
  RoadmapLayout,
  RoadmapHero,
  FeatureList,
  FilterState,
  SubmitFeatureModal,
} from '@/components/roadmap';
import {
  RoadmapFeature,
  RoadmapStats,
  fetchFeatures,
  fetchStats,
  fetchUserVotesForUser,
  toggleVote,
  submitFeatureRequest,
} from '@/lib/roadmap';
import { useAuth, AuthData } from '@/lib/providers/AuthProvider';

interface RoadmapIndexPageProps {
  auth?: AuthData;
}

export default function RoadmapIndexPage({ auth: authProp }: RoadmapIndexPageProps) {
  // Use auth from props if available (passed from layout), otherwise use hook
  const authFromHook = useAuth();
  const auth = authProp || authFromHook;
  const [features, setFeatures] = useState<RoadmapFeature[]>([]);
  const [stats, setStats] = useState<RoadmapStats>({ totalFeatures: 0, totalVotes: 0, inProgress: 0 });
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());
  // Loading state for data fetching
  const [dataLoading, setDataLoading] = useState(true);
  const loading = dataLoading;
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    search: '',
    status: 'active',
    category: 'all',
    sortBy: 'votes',
  });
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // Load data on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      setDataLoading(true);
      console.log('[Roadmap] Starting data fetch...');
      
      try {
        // Fetch data regardless of auth state - let RLS handle access
        const [featuresData, statsData, userVotes] = await Promise.all([
          fetchFeatures('active', undefined, 'votes', undefined, auth.org_id || undefined, auth.id),
          fetchStats(auth.org_id || undefined),
          fetchUserVotesForUser(auth.id),
        ]);
        
        console.log('[Roadmap] Fetched features:', featuresData.length);
        
        if (isMounted) {
          setFeatures(featuresData);
          setStats(statsData);
          setVotedFeatures(userVotes);
        }
      } catch (error) {
        console.error('[Roadmap] Error loading roadmap data:', error);
      } finally {
        if (isMounted) {
          setDataLoading(false);
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(async (filters: FilterState) => {
    setCurrentFilters(filters);
    setDataLoading(true);
    try {
      const featuresData = await fetchFeatures(
        filters.status,
        filters.category,
        filters.sortBy,
        filters.search,
        auth.org_id || undefined,
        auth.id
      );
      setFeatures(featuresData);
    } catch (error) {
      console.error('Error filtering features:', error);
    } finally {
      setDataLoading(false);
    }
  }, [auth.org_id, auth.id]);

  // Handle voting
  const handleVote = useCallback(async (featureId: string) => {
    const hasVoted = votedFeatures.has(featureId);
    if (!auth.id) return;
    
    // Optimistic update
    setVotedFeatures(prev => {
      const next = new Set(prev);
      if (hasVoted) {
        next.delete(featureId);
      } else {
        next.add(featureId);
      }
      return next;
    });
    
    setFeatures(prev => prev.map(f => {
      if (f.id === featureId) {
        return { ...f, vote_count: f.vote_count + (hasVoted ? -1 : 1) };
      }
      return f;
    }));

    // Update stats
    setStats(prev => ({
      ...prev,
      totalVotes: prev.totalVotes + (hasVoted ? -1 : 1),
    }));

    try {
      await toggleVote(featureId, hasVoted, auth.id);
    } catch (error) {
      // Revert on error
      setVotedFeatures(prev => {
        const next = new Set(prev);
        if (hasVoted) {
          next.add(featureId);
        } else {
          next.delete(featureId);
        }
        return next;
      });
      
      setFeatures(prev => prev.map(f => {
        if (f.id === featureId) {
          return { ...f, vote_count: f.vote_count + (hasVoted ? 1 : -1) };
        }
        return f;
      }));

      setStats(prev => ({
        ...prev,
        totalVotes: prev.totalVotes + (hasVoted ? 1 : -1),
      }));
    }
  }, [votedFeatures, auth.id]);

  // Handle feature submission
  const handleSubmitFeature = useCallback(async (
    title: string,
    category: string,
    description: string
  ): Promise<boolean> => {
    if (!auth.id) return false;
    
    const newFeature = await submitFeatureRequest(
      title,
      category,
      description,
      auth.id,
      auth.org_id || undefined
    );
    
    if (newFeature) {
      // Add the user's submitted feature to the list (they can see their own pending features)
      setFeatures(prev => [newFeature, ...prev]);
      setStats(prev => ({
        ...prev,
        totalFeatures: prev.totalFeatures + 1,
      }));
      return true;
    }
    
    return false;
  }, [auth.id, auth.org_id]);

  return (
    <RoadmapLayout subHeaderMode="list" activeTab="features">
      <RoadmapHero stats={stats} onSubmitClick={() => setIsSubmitModalOpen(true)} />
      <FeatureList
        features={features}
        loading={loading}
        votedFeatures={votedFeatures}
        onVote={handleVote}
        onFilterChange={handleFilterChange}
      />
      <SubmitFeatureModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmit={handleSubmitFeature}
      />
    </RoadmapLayout>
  );
}
