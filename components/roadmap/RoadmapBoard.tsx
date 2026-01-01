import { useState } from 'react';
import { RoadmapFeature, PRIORITY_CONFIG, CATEGORY_MAP, CATEGORIES, STATUS_CONFIG, formatDate } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface RoadmapBoardProps {
  sections: {
    title: string;
    statusKey: RoadmapFeature['status'];
    count: number;
    items: RoadmapFeature[];
  }[];
}

// Helper to get display category (maps old categories to new ones)
function getDisplayCategory(category: string): string {
  if (CATEGORIES.includes(category)) {
    return category;
  }
  return CATEGORY_MAP[category] || 'Feature';
}

// Get section class based on status
function getSectionClass(statusKey: string): string {
  switch (statusKey) {
    case 'planned':
      return styles.boardSectionPlanned;
    case 'in_progress':
      return styles.boardSectionInProgress;
    case 'completed':
      return styles.boardSectionCompleted;
    default:
      return '';
  }
}

export function RoadmapBoard({ sections }: RoadmapBoardProps) {
  const [selectedFeature, setSelectedFeature] = useState<RoadmapFeature | null>(null);

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCardClick = (feature: RoadmapFeature) => {
    setSelectedFeature(feature);
  };

  const handleCloseModal = () => {
    setSelectedFeature(null);
  };

  return (
    <>
      <div className={styles.board}>
        {sections.map((section) => (
          <div 
            key={section.statusKey} 
            className={`${styles.boardSection} ${getSectionClass(section.statusKey)}`}
          >
            <div className={styles.boardSectionHeader}>
              <span>{section.title}</span>
              <span className={styles.boardSectionCount}>{section.count}</span>
            </div>
            <div className={styles.boardCards}>
              {section.items.map((feature) => {
                const priorityConfig = PRIORITY_CONFIG[feature.priority];
                const displayCategory = getDisplayCategory(feature.category);
                return (
                  <div 
                    key={feature.id} 
                    className={styles.boardCard}
                    onClick={() => handleCardClick(feature)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCardClick(feature);
                      }
                    }}
                  >
                    <div className={styles.boardCardTop}>
                      <div className={styles.boardCardTitle}>{feature.title}</div>
                      <span
                        className={styles.boardPriority}
                        style={{
                          backgroundColor: priorityConfig.bgColor,
                          color: priorityConfig.textColor,
                          borderColor: priorityConfig.borderColor,
                        }}
                      >
                        {priorityConfig.label}
                      </span>
                    </div>
                    {feature.description && (
                      <p className={styles.boardCardDescription}>
                        {feature.description.slice(0, 100)}{feature.description.length > 100 ? '...' : ''}
                      </p>
                    )}
                    <div className={styles.boardTagsRow}>
                      <span className={styles.categoryTag}>{displayCategory}</span>
                    </div>
                    <div className={styles.boardMetaRow}>
                      <div className={styles.boardMetaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="18 15 12 9 6 15"></polyline>
                        </svg>
                        <span>{feature.vote_count}</span>
                      </div>
                      <div className={styles.boardMetaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <span>{feature.comment_count}</span>
                      </div>
                      <div className={styles.boardMetaItem}>
                        <span>{formatDateShort(feature.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {section.items.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                  No items yet
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Feature Detail Modal */}
      {selectedFeature && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <button 
              type="button" 
              className={styles.modalCloseButton}
              onClick={handleCloseModal}
              aria-label="Close modal"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <h2 className={styles.modalTitle}>{selectedFeature.title}</h2>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <span 
                className={styles.statusBadge}
                style={{
                  backgroundColor: STATUS_CONFIG[selectedFeature.status].bgColor,
                  color: STATUS_CONFIG[selectedFeature.status].textColor,
                  border: `1px solid ${STATUS_CONFIG[selectedFeature.status].borderColor}`,
                }}
              >
                {STATUS_CONFIG[selectedFeature.status].label}
              </span>
              <span 
                className={styles.boardPriority}
                style={{
                  backgroundColor: PRIORITY_CONFIG[selectedFeature.priority].bgColor,
                  color: PRIORITY_CONFIG[selectedFeature.priority].textColor,
                  borderColor: PRIORITY_CONFIG[selectedFeature.priority].borderColor,
                }}
              >
                {PRIORITY_CONFIG[selectedFeature.priority].label}
              </span>
              <span className={styles.categoryTag}>{getDisplayCategory(selectedFeature.category)}</span>
            </div>

            {selectedFeature.description && (
              <p style={{ 
                fontSize: '15px', 
                lineHeight: '1.7', 
                color: '#4b5563', 
                marginBottom: '20px',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedFeature.description}
              </p>
            )}

            <div style={{ 
              display: 'flex', 
              gap: '20px', 
              paddingTop: '16px', 
              borderTop: '1px solid #e5e7eb',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
                <span><strong>{selectedFeature.vote_count}</strong> votes</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <span><strong>{selectedFeature.comment_count}</strong> comments</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Created {formatDate(selectedFeature.created_at)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
