import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './Roadmap.module.css';

interface RoadmapHeaderProps {
  showBackToFeatures?: boolean;
}

export default function RoadmapHeader({ showBackToFeatures = false }: RoadmapHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        {showBackToFeatures && (
          <Link href="/" className={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Features
          </Link>
        )}
        {showBackToFeatures && <span className={styles.headerDivider}>•</span>}
        <span className={styles.headerLabel}>Feature Request</span>
      </div>
      
      <div className={styles.headerCenter}>
        <Link href="/" className={styles.logo}>
          <Image
            src="/Levelset Icon Non Trans.png"
            alt="Levelset"
            width={28}
            height={28}
            className={styles.logoIcon}
            style={{ borderRadius: '6px' }}
          />
          <span>Levelset</span>
        </Link>
      </div>
      
      <div className={styles.headerRight}>
        <a 
          href="https://levelset.io" 
          className={styles.headerLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Back to Website →
        </a>
      </div>
    </header>
  );
}
