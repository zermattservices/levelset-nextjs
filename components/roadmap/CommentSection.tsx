import React, { useState } from 'react';
import { RoadmapComment, timeAgo } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface CommentSectionProps {
  comments: RoadmapComment[];
  commentCount: number;
  onSubmit: (content: string, authorName?: string, authorEmail?: string) => Promise<void>;
}

export default function CommentSection({ comments, commentCount, onSubmit }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      await onSubmit(content, authorName, authorEmail);
      setContent('');
      // Keep name and email for future comments
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

  return (
    <div className={styles.commentSection}>
      <h3 className={styles.commentTitle}>Comments ({commentCount})</h3>
      
      {/* Comment Form */}
      <div className={styles.commentForm}>
        <div className={styles.commentFormRow}>
          <input
            type="text"
            className={styles.commentInput}
            placeholder="Your name (optional)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
          />
          <input
            type="email"
            className={styles.commentInput}
            placeholder="Your email (optional)"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
          />
        </div>
        <textarea
          className={styles.commentTextarea}
          placeholder="Share your thoughts..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
        />
        <button
          className={styles.commentSubmitButton}
          onClick={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          💬 {submitting ? 'Posting...' : 'Post Comment'}
        </button>
      </div>
      
      {/* Comment List */}
      <div className={styles.commentList}>
        {comments.length === 0 ? (
          <p className={styles.noComments}>No comments yet. Be the first to share your thoughts!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.commentAvatar}>
                  {comment.author_name.charAt(0).toUpperCase()}
                </span>
                <span className={styles.commentAuthor}>{comment.author_name}</span>
                <span className={styles.commentTime}>{timeAgo(comment.created_at)}</span>
              </div>
              <p className={styles.commentText}>{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
