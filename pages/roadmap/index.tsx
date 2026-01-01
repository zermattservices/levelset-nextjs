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

  // Use a ref to track if we've loaded data (to prevent re-fetching)
  const hasLoadedRef = useRef(false);
  const prevOrgIdRef = useRef<string | undefined>(undefined);
  
  // Load data when auth becomes ready
  useEffect(() => {
    // If auth isn't loaded yet, wait
    if (!auth.isLoaded) {
      return;
    }
    
    // If we've already loaded and org hasn't changed, skip
    if (hasLoadedRef.current && prevOrgIdRef.current === auth.org_id) {
      return;
    }
    
    let isMounted = true;
    
    const loadData = async () => {
      setDataLoading(true);
      try {
        const [featuresData, statsData, userVotes] = await Promise.all([
          fetchFeatures('active', undefined, 'votes', undefined, auth.org_id || undefined),
          fetchStats(auth.org_id || undefined),
          fetchUserVotesForUser(auth.id),
        ]);
        
        if (isMounted) {
          setFeatures(featuresData);
          setStats(statsData);
          setVotedFeatures(userVotes);
          hasLoadedRef.current = true;
          prevOrgIdRef.current = auth.org_id;
        }
      } catch (error) {
        console.error('Error loading roadmap data:', error);
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
  }, [auth.isLoaded, auth.id, auth.org_id]);

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
