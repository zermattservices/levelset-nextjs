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
      <Link href="/" className={styles.logo}>
        <Image
          src="/Levelset Icon Non Trans.png"
          alt="Levelset"
          width={32}
          height={32}
          className={styles.logoIcon}
          style={{ borderRadius: '6px' }}
        />
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
