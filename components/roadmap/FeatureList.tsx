import React, { useState, useCallback } from 'react';
import { RoadmapFeature, CATEGORIES } from '@/lib/roadmap';
import FeatureCard from './FeatureCard';
import styles from './Roadmap.module.css';

interface FeatureListProps {
  features: RoadmapFeature[];
  loading: boolean;
  votedFeatures: Set<string>;
  onVote: (featureId: string) => void;
  onFilterChange: (filters: FilterState) => void;
}

export interface FilterState {
  search: string;
  status: string;
  category: string;
  sortBy: 'votes' | 'newest' | 'oldest';
}

export default function FeatureList({ 
  features, 
  loading, 
  votedFeatures, 
  onVote,
  onFilterChange 
}: FeatureListProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'active',
    category: 'all',
    sortBy: 'votes',
  });

  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  return (
    <div className={styles.content} id="features">
      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrapper}>
          <svg 
            className={styles.searchIcon} 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
          >
            <path 
              d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M14 14L10.5 10.5" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search features..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
          />
        </div>
        
        <select
          className={styles.filterSelect}
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="active">Active</option>
          <option value="all">All Status</option>
          <option value="idea">Ideas</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        
        <select
          className={styles.filterSelect}
          value={filters.category}
          onChange={(e) => handleFilterChange('category', e.target.value)}
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        
        <select
          className={styles.filterSelect}
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value as FilterState['sortBy'])}
        >
          <option value="votes">Most Votes</option>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
      
      {/* Feature List */}
      <div className={styles.featureList}>
        {loading ? (
          <div className={styles.loadingState}>Loading features...</div>
        ) : features.length === 0 ? (
          <div className={styles.emptyState}>
            No features found. Be the first to submit an idea!
          </div>
        ) : (
          features.map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              hasVoted={votedFeatures.has(feature.id)}
              onVote={onVote}
            />
          ))
        )}
      </div>
    </div>
  );
}
