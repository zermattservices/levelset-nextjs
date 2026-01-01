import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RoadmapLayout,
  RoadmapHero,
  FeatureList,
  FilterState,
} from '@/components/roadmap';
import {
  RoadmapFeature,
  RoadmapStats,
  fetchFeatures,
  fetchStats,
  fetchUserVotesForUser,
  toggleVote,
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

  // Track loading state with a ref to prevent duplicate fetches
  const loadingRef = useRef(false);
  
  // Load data on mount and when auth/org changes
  useEffect(() => {
    // Prevent duplicate fetches
    if (loadingRef.current) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      loadingRef.current = true;
      setDataLoading(true);
      
      try {
        // Fetch data regardless of auth state - let RLS handle access
        const [featuresData, statsData, userVotes] = await Promise.all([
          fetchFeatures('active', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchStats(auth.org_id || undefined),
          fetchUserVotesForUser(auth.id),
        ]);
        
        if (isMounted) {
          setFeatures(featuresData);
          setStats(statsData);
          setVotedFeatures(userVotes);
        }
      } catch (error) {
        console.error('Error loading roadmap data:', error);
      } finally {
        if (isMounted) {
          setDataLoading(false);
          loadingRef.current = false;
        }
      }
    };

    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [auth.org_id, auth.id]);

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
        auth.org_id || undefined
      );
      setFeatures(featuresData);
    } catch (error) {
      console.error('Error filtering features:', error);
    } finally {
      setDataLoading(false);
    }
  }, [auth.org_id]);

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

  return (
    <RoadmapLayout subHeaderMode="list" activeTab="features">
      <RoadmapHero stats={stats} />
      <FeatureList
        features={features}
        loading={loading}
        votedFeatures={votedFeatures}
        onVote={handleVote}
        onFilterChange={handleFilterChange}
      />
    </RoadmapLayout>
  );
}
