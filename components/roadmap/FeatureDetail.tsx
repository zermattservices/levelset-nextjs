import React from 'react';
import { RoadmapFeature, formatDate, STATUS_CONFIG, PRIORITY_CONFIG } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface FeatureDetailProps {
  feature: RoadmapFeature;
  hasVoted: boolean;
  onVote: () => void;
}

export default function FeatureDetail({ feature, hasVoted, onVote }: FeatureDetailProps) {
  const statusConfig = STATUS_CONFIG[feature.status];
  const priorityConfig = PRIORITY_CONFIG[feature.priority];

  return (
    <div className={styles.detailTitleRow}>
      <div className={styles.detailTitleContent}>
        <h1 className={styles.detailTitle}>{feature.title}</h1>
        <div className={styles.detailBadges}>
          {/* Status Badge */}
          <span 
            className={styles.statusBadge}
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            <span 
              className={styles.statusDot}
              style={{ backgroundColor: statusConfig.textColor }}
            />
            {statusConfig.label}
          </span>
          
          {/* Priority Badge (only show if critical or high) */}
          {(feature.priority === 'critical' || feature.priority === 'high') && (
            <span 
              className={styles.priorityBadge}
              style={{
                backgroundColor: priorityConfig.bgColor,
                color: priorityConfig.textColor,
                border: `1px solid ${priorityConfig.borderColor}`,
              }}
            >
              <span 
                className={styles.priorityDot}
                style={{ backgroundColor: priorityConfig.textColor }}
              />
              {priorityConfig.label}
            </span>
          )}
          
          {/* Category Tag */}
          <span className={styles.categoryTag}>{feature.category}</span>
        </div>
      </div>
      
      {/* Vote Button - Levelset green */}
      <button
        className={`${styles.detailVoteButton} ${hasVoted ? styles.detailVoteButtonActive : ''}`}
        onClick={onVote}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        <span className={styles.detailVoteCount}>{feature.vote_count}</span>
        <span className={styles.detailVoteLabel}>VOTES</span>
      </button>
    </div>
  );
}

interface FeatureSidebarProps {
  feature: RoadmapFeature;
}

export function FeatureSidebar({ feature }: FeatureSidebarProps) {
  const statusConfig = STATUS_CONFIG[feature.status];
  const priorityConfig = PRIORITY_CONFIG[feature.priority];

  return (
    <aside className={styles.detailSidebar}>
      {/* Status Section */}
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <svg className={styles.sidebarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <h4 className={styles.sidebarTitle}>Status</h4>
        </div>
        <div className={styles.statusCard}>
          <span className={styles.statusCardLabel}>Current Status</span>
          <span 
            className={styles.statusBadge}
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.textColor,
              border: `1px solid ${statusConfig.borderColor}`,
            }}
          >
            <span 
              className={styles.statusDot}
              style={{ backgroundColor: statusConfig.textColor }}
            />
            {statusConfig.label}
          </span>
        </div>
      </div>
      
      {/* Community Section */}
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <svg className={styles.sidebarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h4 className={styles.sidebarTitle}>Community</h4>
        </div>
        <div className={styles.communityStats}>
          <div className={styles.communityStat}>
            <div className={styles.communityStatLeft}>
              <div className={`${styles.communityStatIcon} ${styles.communityStatIconVotes}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                </svg>
              </div>
              <span className={styles.communityStatLabel}>Votes</span>
            </div>
            <span className={styles.communityStatValue}>{feature.vote_count}</span>
          </div>
          <div className={styles.communityStat}>
            <div className={styles.communityStatLeft}>
              <div className={`${styles.communityStatIcon} ${styles.communityStatIconComments}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <span className={styles.communityStatLabel}>Comments</span>
            </div>
            <span className={styles.communityStatValue}>{feature.comment_count}</span>
          </div>
        </div>
      </div>
      
      {/* Details Section */}
      <div className={styles.sidebarSection}>
        <div className={styles.sidebarSectionHeader}>
          <svg className={styles.sidebarIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h4 className={styles.sidebarTitle}>Details</h4>
        </div>
        <div className={styles.detailsList}>
          <div className={styles.detailItem}>
            <span className={styles.detailItemLabel}>Category</span>
            <span className={styles.detailItemValue}>{feature.category}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailItemLabel}>Created</span>
            <span className={styles.detailItemValue}>{formatDate(feature.created_at)}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailItemLabel}>Status</span>
            <span 
              className={styles.statusBadge}
              style={{
                backgroundColor: statusConfig.bgColor,
                color: statusConfig.textColor,
                border: `1px solid ${statusConfig.borderColor}`,
                fontSize: '12px',
                padding: '4px 8px',
              }}
            >
              <span 
                className={styles.statusDot}
                style={{ backgroundColor: statusConfig.textColor, width: '5px', height: '5px' }}
              />
              {statusConfig.label}
            </span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailItemLabel}>Priority</span>
            <span 
              className={styles.priorityBadge}
              style={{
                backgroundColor: priorityConfig.bgColor,
                color: priorityConfig.textColor,
                border: `1px solid ${priorityConfig.borderColor}`,
                fontSize: '12px',
                padding: '4px 8px',
              }}
            >
              <span 
                className={styles.priorityDot}
                style={{ backgroundColor: priorityConfig.textColor, width: '5px', height: '5px' }}
              />
              {priorityConfig.label}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
