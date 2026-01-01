import React, { useState } from 'react';
import { CATEGORIES } from '@/lib/roadmap';
import styles from './Roadmap.module.css';

interface SubmitFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, category: string, description: string) => Promise<boolean>;
}

export default function SubmitFeatureModal({ isOpen, onClose, onSubmit }: SubmitFeatureModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!category) {
      setError('Please select a category');
      return;
    }
    if (!description.trim()) {
      setError('Description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await onSubmit(title.trim(), category, description.trim());
      if (success) {
        // Reset form and close
        setTitle('');
        setCategory('');
        setDescription('');
        onClose();
      } else {
        setError('Failed to submit feature request. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setTitle('');
      setCategory('');
      setDescription('');
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button 
          type="button" 
          className={styles.modalCloseButton}
          onClick={handleClose}
          disabled={isSubmitting}
          aria-label="Close modal"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <h2 className={styles.modalTitle}>Submit Feature Request</h2>
        <p className={styles.modalSubtitle}>
          Have an idea that could improve the product? Share it with the community!
        </p>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalFormRow}>
            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>
                Title <span className={styles.requiredStar}>*</span>
              </label>
              <input
                type="text"
                className={styles.modalInput}
                placeholder="Enter a clear, descriptive title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isSubmitting}
                maxLength={200}
              />
            </div>

            <div className={styles.modalFormGroup}>
              <label className={styles.modalLabel}>Category</label>
              <select
                className={styles.modalSelect}
                value={category}
                onChange={e => setCategory(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Select a category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.modalFormGroup}>
            <label className={styles.modalLabel}>
              Description <span className={styles.requiredStar}>*</span>
            </label>
            <textarea
              className={styles.modalTextarea}
              placeholder="Describe your feature request in detail. What problem does it solve?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              maxLength={2000}
            />
          </div>

          <div className={styles.modalTips}>
            <div className={styles.modalTipsIcon}>💡</div>
            <div>
              <strong>Tips for a great request:</strong>
              <ul className={styles.modalTipsList}>
                <li>Be specific about the problem you&apos;re solving</li>
                <li>Include use cases when possible</li>
                <li>Consider how it benefits other users</li>
              </ul>
            </div>
          </div>

          {error && (
            <div className={styles.modalError}>{error}</div>
          )}

          <div className={styles.modalActions}>
            <button
              type="submit"
              className={styles.modalSubmitButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                'Submitting...'
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                  Submit Request
                </>
              )}
            </button>
            <button
              type="button"
              className={styles.modalCancelButton}
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
