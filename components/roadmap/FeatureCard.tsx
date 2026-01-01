import React from 'react';
import { useRouter } from 'next/router';
import { RoadmapFeature, isPopular, STATUS_CONFIG } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface FeatureCardProps {
  feature: RoadmapFeature;
  hasVoted: boolean;
  onVote: (featureId: string) => void;
}

export default function FeatureCard({ feature, hasVoted, onVote }: FeatureCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/${feature.id}`);
  };

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onVote(feature.id);
  };

  const truncatedDescription = feature.description 
    ? feature.description.slice(0, 200) + (feature.description.length > 200 ? '...' : '')
    : '';

  const statusConfig = STATUS_CONFIG[feature.status];
  const popular = isPopular(feature.vote_count);

  return (
    <div className={styles.featureCard} onClick={handleCardClick}>
      <div className={styles.featureCardContent}>
        {/* Title row with status badge */}
        <div className={styles.featureCardHeader}>
          <h3 className={styles.featureCardTitle}>{feature.title}</h3>
          <span 
            className={styles.statusBadgeSmall}
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
            }}
          >
            {statusConfig.label}
          </span>
        </div>
        
        {/* Popular badge - only show if popular */}
        {popular && (
          <div className={styles.popularBadge}>
            <span className={styles.popularIcon}>🔥</span>
            <span>Popular</span>
          </div>
        )}
        
        {/* Description */}
        {truncatedDescription && (
          <p className={styles.featureCardDescription}>{truncatedDescription}</p>
        )}
        
        {/* Category tag */}
        <span className={styles.categoryTag}>{feature.category}</span>
      </div>
      
      {/* Simple upvote button - FormFlow style */}
      <div 
        className={`${styles.voteButton} ${hasVoted ? styles.voteButtonActive : ''}`}
        onClick={handleVoteClick}
        role="button"
        aria-label={hasVoted ? 'Remove vote' : 'Vote for this feature'}
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
        <span className={styles.voteCount}>{feature.vote_count}</span>
      </div>
    </div>
  );
}
