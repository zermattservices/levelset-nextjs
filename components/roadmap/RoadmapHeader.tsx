import React from 'react';
import Link from 'next/link';
import styles from './Roadmap.module.css';

interface RoadmapHeaderProps {
  showBackToFeatures?: boolean;
}

export default function RoadmapHeader({ showBackToFeatures = false }: RoadmapHeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.logo}>
        <svg 
          className={styles.logoIcon} 
          viewBox="0 0 32 32" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="32" height="32" rx="8" fill="#31664a"/>
          <path 
            d="M8 16L14 22L24 10" 
            stroke="white" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        <span>Levelset</span>
      </Link>
      
      {showBackToFeatures ? (
        <Link href="/" className={styles.backLink}>
          ← Back to Features
        </Link>
      ) : (
        <a 
          href="https://levelset.io" 
          className={styles.backLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Back to Website →
        </a>
      )}
    </header>
  );
}
