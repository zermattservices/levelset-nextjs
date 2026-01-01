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
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            {statusConfig.label}
          </span>
        </div>
        
        {/* Popular badge */}
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
      
      {/* Vote button - tall blue rectangle on right */}
      <div 
        className={`${styles.voteButtonTall} ${hasVoted ? styles.voteButtonTallActive : ''}`}
        onClick={handleVoteClick}
        role="button"
        aria-label={hasVoted ? 'Remove vote' : 'Vote for this feature'}
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <polyline points="18 15 12 9 6 15"></polyline>
        </svg>
        <span className={styles.voteCountTall}>{feature.vote_count}</span>
      </div>
    </div>
  );
}
