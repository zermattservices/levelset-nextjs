import React from 'react';
import { RoadmapFeature, formatDate } from '@/lib/roadmap';
import { StatusBadge, PriorityBadge } from './StatusBadge';
import styles from './Roadmap.module.css';

interface FeatureDetailProps {
  feature: RoadmapFeature;
  hasVoted: boolean;
  onVote: () => void;
}

export default function FeatureDetail({ feature, hasVoted, onVote }: FeatureDetailProps) {
  return (
    <div className={styles.detailTitleRow}>
      <div className={styles.detailTitleContent}>
        <h1 className={styles.detailTitle}>{feature.title}</h1>
        <div className={styles.detailBadges}>
          <StatusBadge status={feature.status} />
          <PriorityBadge priority={feature.priority} />
          <span className={styles.categoryTag}>{feature.category}</span>
        </div>
      </div>
      
      <button
        className={`${styles.detailVoteButton} ${hasVoted ? styles.detailVoteButtonActive : ''}`}
        onClick={onVote}
      >
        👍 {feature.vote_count}
      </button>
    </div>
  );
}

interface FeatureSidebarProps {
  feature: RoadmapFeature;
}

export function FeatureSidebar({ feature }: FeatureSidebarProps) {
  return (
    <aside className={styles.detailSidebar}>
      <div className={styles.sidebarSection}>
        <h4 className={styles.sidebarTitle}>Status</h4>
        <StatusBadge status={feature.status} />
      </div>
      
      <div className={styles.sidebarSection}>
        <h4 className={styles.sidebarTitle}>Community</h4>
        <div className={styles.sidebarStats}>
          <span>👍 {feature.vote_count} Votes</span>
          <span>💬 {feature.comment_count} Comments</span>
        </div>
      </div>
      
      <div className={styles.sidebarSection}>
        <h4 className={styles.sidebarTitle}>Details</h4>
        <p className={styles.sidebarDetail}>
          <strong>Category:</strong> {feature.category}
        </p>
        <p className={styles.sidebarDetail}>
          <strong>Created:</strong> {formatDate(feature.created_at)}
        </p>
        <p className={styles.sidebarDetail}>
          <strong>Priority:</strong> {feature.priority.charAt(0).toUpperCase() + feature.priority.slice(1)}
        </p>
      </div>
    </aside>
  );
}
