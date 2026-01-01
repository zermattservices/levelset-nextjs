import React from 'react';
import { RoadmapStats } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface RoadmapHeroProps {
  stats: RoadmapStats;
}

export default function RoadmapHero({ stats }: RoadmapHeroProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  return (
    <section className={styles.hero}>
      <div className={styles.badge}>
        <span className={styles.badgeDot} />
        Shape the Future
      </div>
      
      <h1 className={styles.heroTitle}>
        Welcome to<br />
        <span className={styles.heroTitleAccent}>Levelset</span>
      </h1>
      
      <p className={styles.heroSubtitle}>
        Share your ideas, vote on features, and help shape the future of Levelset together
      </p>
      
      <div className={styles.heroButtons}>
        <a 
          href="mailto:feedback@levelset.io?subject=Feature Request"
          className={styles.primaryButton}
        >
          + Submit Your Idea
        </a>
        <a href="#features" className={styles.secondaryButton}>
          Explore Features
        </a>
      </div>
      
      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{formatNumber(stats.totalFeatures)}</span>
          <span className={styles.statLabel}>Ideas Submitted</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{formatNumber(stats.totalVotes)}</span>
          <span className={styles.statLabel}>Votes Cast</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{formatNumber(stats.inProgress)}</span>
          <span className={styles.statLabel}>In Progress</span>
        </div>
      </div>
    </section>
  );
}
