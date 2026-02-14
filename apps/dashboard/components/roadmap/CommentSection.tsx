import React, { useState } from 'react';
import { RoadmapComment, timeAgo } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface CommentSectionProps {
  comments: RoadmapComment[];
  commentCount: number;
  onSubmit: (content: string, authorName?: string, authorEmail?: string) => Promise<void>;
}

const MAX_CHARACTERS = 1000;

export default function CommentSection({ comments, commentCount, onSubmit }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting || content.length > MAX_CHARACTERS) return;
    
    setSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CHARACTERS) {
      setContent(value);
    }
  };

  return (
    <div className={styles.commentSection}>
      {/* Comment Form */}
      <div className={styles.commentForm}>
        <textarea
          className={styles.commentTextarea}
          placeholder="Share your thoughts on this feature request..."
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.commentFormRow}>
          <span className={styles.characterCount}>
            {content.length}/{MAX_CHARACTERS} characters
          </span>
          <button
            className={styles.commentSubmitButton}
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            {submitting ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>
      
      {/* Comment List */}
      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <p className={styles.noComments}>No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <span className={styles.commentAvatar}>
                {comment.author_name.charAt(0).toUpperCase()}
              </span>
              <div className={styles.commentBody}>
                <div className={styles.commentHeader}>
                  <span className={styles.commentAuthor}>{comment.author_name}</span>
                  <span className={styles.commentTime}>{timeAgo(comment.created_at)}</span>
                </div>
                <p className={styles.commentText}>{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
