import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import {
  RoadmapLayout,
  FeatureDetail,
  FeatureSidebar,
  CommentSection,
} from '@/components/roadmap';
import {
  RoadmapFeature,
  RoadmapComment,
  fetchFeatureById,
  fetchComments,
  fetchUserVotesForUser,
  toggleVote,
  submitComment,
  formatDate,
} from '@/lib/roadmap';
import styles from '@/components/roadmap/Roadmap.module.css';
import { useAuth } from '@/lib/providers/AuthProvider';

export default function FeatureDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const auth = useAuth();
  
  const [feature, setFeature] = useState<RoadmapFeature | null>(null);
  const [comments, setComments] = useState<RoadmapComment[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load feature and comments on mount
  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    let isMounted = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const [featureData, commentsData, userVotes] = await Promise.all([
          fetchFeatureById(id, auth.org_id || undefined),
          fetchComments(id),
          fetchUserVotesForUser(auth.id),
        ]);
        
        if (isMounted) {
          setFeature(featureData);
          setComments(commentsData);
          setHasVoted(userVotes.has(id));
        }
      } catch (error) {
        console.error('Error loading feature:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Handle voting
  const handleVote = useCallback(async () => {
    if (!feature) return;
    
    // Wait for auth to be loaded
    if (!auth.isLoaded) {
      console.log('[Roadmap] Auth not loaded yet, waiting...');
      return;
    }
    
    if (!auth.id) {
      console.warn('[Roadmap] User not authenticated, cannot vote');
      alert('Please log in to vote for features.');
      return;
    }

    const wasVoted = hasVoted;
    
    // Optimistic update
    setHasVoted(!wasVoted);
    setFeature(prev => prev ? {
      ...prev,
      vote_count: prev.vote_count + (wasVoted ? -1 : 1),
    } : null);

    try {
      await toggleVote(feature.id, wasVoted, auth.id);
    } catch (error) {
      // Revert on error
      setHasVoted(wasVoted);
      setFeature(prev => prev ? {
        ...prev,
        vote_count: prev.vote_count + (wasVoted ? 1 : -1),
      } : null);
    }
  }, [feature, hasVoted, auth.id, auth.isLoaded]);

  // Handle comment submission
  const handleCommentSubmit = useCallback(async (
    content: string,
    authorName?: string,
    authorEmail?: string
  ) => {
    if (!feature) return;

    const newComment = await submitComment(
      feature.id,
      content,
      authorName || auth.full_name || `${auth.first_name || ''} ${auth.last_name || ''}`.trim() || 'Anonymous',
      authorEmail || auth.email || undefined
    );
    
    if (newComment) {
      setComments(prev => [newComment, ...prev]);
      setFeature(prev => prev ? {
        ...prev,
        comment_count: prev.comment_count + 1,
      } : null);
    }
  }, [feature, auth.full_name, auth.first_name, auth.last_name, auth.email]);

  if (loading) {
    return (
      <RoadmapLayout title="Loading... | Levelset Roadmap" subHeaderMode="detail">
        <div className={styles.loadingState} style={{ padding: '100px 20px' }}>
          Loading feature...
        </div>
      </RoadmapLayout>
    );
  }

  if (!feature) {
    return (
      <RoadmapLayout title="Feature Not Found | Levelset Roadmap" subHeaderMode="detail">
        <div className={styles.emptyState} style={{ margin: '100px auto', maxWidth: '600px' }}>
          <h2>Feature not found</h2>
          <p>This feature may have been removed or doesn&apos;t exist.</p>
          <a href="/" className={styles.primaryButton} style={{ marginTop: '20px', display: 'inline-flex' }}>
            Back to Roadmap
          </a>
        </div>
      </RoadmapLayout>
    );
  }

  return (
    <RoadmapLayout 
      title={`${feature.title} | Levelset Roadmap`}
      description={feature.description || `View details and vote for ${feature.title}`}
      subHeaderMode="detail"
    >
      <main className={styles.detailMain}>
        <div className={styles.detailContent}>
          <FeatureDetail
            feature={feature}
            hasVoted={hasVoted}
            onVote={handleVote}
          />
          
          {feature.description && (
            <p className={styles.detailDescription}>{feature.description}</p>
          )}
          
          {/* Author Info - Levelset branding */}
          <div className={styles.authorInfo}>
            <img 
              src="/logos/Levelset no margin.png" 
              alt="Levelset" 
              className={styles.authorAvatarImg}
            />
            <div className={styles.authorDetails}>
              <span className={styles.authorName}>Levelset</span>
              <span className={styles.authorDate}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Posted {formatDate(feature.created_at)}
              </span>
            </div>
          </div>
          
          <CommentSection
            comments={comments}
            commentCount={feature.comment_count}
            onSubmit={handleCommentSubmit}
          />
        </div>
        
        <FeatureSidebar feature={feature} />
      </main>
    </RoadmapLayout>
  );
}
