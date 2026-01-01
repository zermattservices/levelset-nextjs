import { RoadmapFeature, PRIORITY_CONFIG } from '@/lib/roadmap';
import styles from './Roadmap.module.css';
import Link from 'next/link';

interface RoadmapBoardProps {
  sections: {
    title: string;
    statusKey: RoadmapFeature['status'];
    count: number;
    items: RoadmapFeature[];
  }[];
}

export function RoadmapBoard({ sections }: RoadmapBoardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className={styles.board}>
      {sections.map((section) => (
        <div key={section.statusKey} className={styles.boardSection}>
          <div className={styles.boardSectionHeader}>
            <span>{section.title}</span>
            <span className={styles.boardSectionCount}>{section.count}</span>
          </div>
          <div className={styles.boardCards}>
            {section.items.map((feature) => {
              const priorityConfig = PRIORITY_CONFIG[feature.priority];
              return (
                <Link href={`/${feature.id}`} key={feature.id} className={styles.boardCard}>
                  <div className={styles.boardCardTop}>
                    <div className={styles.boardCardTitle}>{feature.title}</div>
                    <span
                      className={styles.boardPriority}
                      style={{
                        backgroundColor: priorityConfig.bgColor,
                        color: priorityConfig.textColor,
                        border: `1px solid ${priorityConfig.borderColor}`,
                      }}
                    >
                      {priorityConfig.label}
                    </span>
                  </div>
                  {feature.description && (
                    <p className={styles.boardCardDescription}>{feature.description}</p>
                  )}
                  <div className={styles.boardTagsRow}>
                    <span className={styles.categoryTag}>{feature.category}</span>
                  </div>
                  <div className={styles.boardMetaRow}>
                    <div className={styles.boardMetaItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                      </svg>
                      <span>{feature.vote_count}</span>
                    </div>
                    <div className={styles.boardMetaItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span>{feature.comment_count}</span>
                    </div>
                    <div className={styles.boardMetaItem}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formatDate(feature.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
