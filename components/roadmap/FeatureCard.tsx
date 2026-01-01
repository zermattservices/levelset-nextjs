import React from 'react';
import { useRouter } from 'next/router';
import { RoadmapFeature } from '@/lib/roadmap';
import { StatusBadge, PriorityBadge } from './StatusBadge';
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
    ? feature.description.slice(0, 150) + (feature.description.length > 150 ? '...' : '')
    : '';

  return (
    <div className={styles.featureCard} onClick={handleCardClick}>
      <div className={styles.featureCardContent}>
        <div className={styles.featureCardHeader}>
          <h3 className={styles.featureCardTitle}>{feature.title}</h3>
          <StatusBadge status={feature.status} />
          <PriorityBadge priority={feature.priority} />
        </div>
        
        {truncatedDescription && (
          <p className={styles.featureCardDescription}>{truncatedDescription}</p>
        )}
        
        <span className={styles.categoryTag}>{feature.category}</span>
      </div>
      
      <div className={styles.voteContainer} onClick={handleVoteClick}>
        <button 
          className={`${styles.voteButton} ${hasVoted ? styles.voteButtonActive : ''}`}
          aria-label={hasVoted ? 'Remove vote' : 'Vote for this feature'}
        >
          ▲
        </button>
        <span className={styles.voteCount}>{feature.vote_count}</span>
      </div>
    </div>
  );
}
