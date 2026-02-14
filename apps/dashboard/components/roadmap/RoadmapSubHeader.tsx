import Link from 'next/link';
import styles from './Roadmap.module.css';

interface RoadmapSubHeaderProps {
  mode: 'list' | 'detail' | 'board';
  activeTab?: 'features' | 'roadmap';
}

export default function RoadmapSubHeader({ mode, activeTab = 'features' }: RoadmapSubHeaderProps) {
  const isList = mode === 'list';
  const isBoard = mode === 'board';
  const isDetail = mode === 'detail';

  return (
    <div className={styles.subHeader}>
      <div className={styles.subHeaderLeft}>
        {isDetail ? (
          <div className={styles.subHeaderBreadcrumb}>
            <Link href="/features" className={styles.subHeaderBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Features
            </Link>
            <span className={styles.subHeaderDot}>•</span>
            <span className={styles.subHeaderLabel}>Feature Request</span>
          </div>
        ) : (
          <div className={styles.subHeaderTabs}>
            <Link
              href="/features"
              className={`${styles.subHeaderTab} ${activeTab === 'features' ? styles.subHeaderTabActive : ''}`}
            >
              Features
            </Link>
            <Link
              href="/roadmap"
              className={`${styles.subHeaderTab} ${activeTab === 'roadmap' ? styles.subHeaderTabActive : ''}`}
            >
              Roadmap
            </Link>
          </div>
        )}
      </div>

      <div className={styles.subHeaderRight}>
        {/* Watch and Share buttons removed */}
      </div>
    </div>
  );
}
