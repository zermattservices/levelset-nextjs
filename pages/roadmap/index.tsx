import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '@/lib/providers/AuthProvider';

export default function RoadmapIndexPage() {
  const auth = useAuth();
  const [features, setFeatures] = useState<RoadmapFeature[]>([]);
  const [stats, setStats] = useState<RoadmapStats>({ totalFeatures: 0, totalVotes: 0, inProgress: 0 });
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());
  // Loading should be true until both auth is ready AND data is fetched
  const [dataLoading, setDataLoading] = useState(true);
  const loading = !auth.isLoaded || dataLoading;
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    search: '',
    status: 'active',
    category: 'all',
    sortBy: 'votes',
  });

  // Track if data has been loaded
  const [dataFetched, setDataFetched] = useState(false);
  
  // Debug render
  console.log('[Roadmap RENDER] auth.isLoaded:', auth.isLoaded, 'auth.id:', auth.id, 'dataFetched:', dataFetched);
  
  // Load data when auth becomes ready
  useEffect(() => {
    console.log('[Roadmap EFFECT] Running, auth.isLoaded:', auth.isLoaded, 'dataFetched:', dataFetched);
    // Skip if auth isn't loaded yet or we've already fetched
    if (!auth.isLoaded || dataFetched) {
      console.log('[Roadmap EFFECT] Skipping fetch - isLoaded:', auth.isLoaded, 'dataFetched:', dataFetched);
      return;
    }
    
    let isMounted = true;
    console.log('[Roadmap] Auth ready, starting data load. org_id:', auth.org_id, 'user_id:', auth.id);
    
    const loadData = async () => {
      setDataLoading(true);
      try {
        const [featuresData, statsData, userVotes] = await Promise.all([
          fetchFeatures('active', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchStats(auth.org_id || undefined),
          fetchUserVotesForUser(auth.id),
        ]);
        
        if (isMounted) {
          console.log('[Roadmap] Data loaded:', { featuresCount: featuresData.length, stats: statsData });
          setFeatures(featuresData);
          setStats(statsData);
          setVotedFeatures(userVotes);
          setDataFetched(true);
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
  }, [auth.isLoaded, auth.id, auth.org_id, dataFetched]);

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
