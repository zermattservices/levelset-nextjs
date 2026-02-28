/**
 * EmailTemplatesPage
 * Admin CRM page for viewing and managing email template metadata.
 * Lists all templates from the email_templates table with active toggle,
 * category badges, and expandable detail cards.
 */

import * as React from 'react';
import { CircularProgress, Switch } from '@mui/material';
import { createSupabaseClient } from '@/util/supabase/component';
import styles from './EmailTemplatesPage.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmailTemplate {
  id: string;
  slug: string;
  name: string;
  subject: string;
  description: string | null;
  category: string;
  preview_text: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

type CategoryFilter = 'all' | 'drip' | 'transactional';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmailTemplatesPage() {
  const [templates, setTemplates] = React.useState<EmailTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>('all');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const [togglingIds, setTogglingIds] = React.useState<Set<string>>(new Set());

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch templates
  React.useEffect(() => {
    async function fetchTemplates() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('email_templates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTemplates((data as EmailTemplate[]) || []);
      } catch (err) {
        console.error('Error fetching email templates:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTemplates();
  }, [supabase]);

  // Filter by category
  const filteredTemplates = React.useMemo(() => {
    if (categoryFilter === 'all') return templates;
    return templates.filter((t) => t.category === categoryFilter);
  }, [templates, categoryFilter]);

  // Summary counts
  const totalCount = templates.length;
  const activeCount = templates.filter((t) => t.active).length;
  const dripCount = templates.filter((t) => t.category === 'drip').length;
  const transactionalCount = templates.filter((t) => t.category === 'transactional').length;

  // Toggle active status
  const handleToggleActive = React.useCallback(
    async (template: EmailTemplate, event: React.ChangeEvent<HTMLInputElement>) => {
      event.stopPropagation();
      const newActive = event.target.checked;

      // Optimistic update
      setTemplates((prev) =>
        prev.map((t) => (t.id === template.id ? { ...t, active: newActive } : t))
      );
      setTogglingIds((prev) => new Set(prev).add(template.id));

      try {
        const { error } = await supabase
          .from('email_templates')
          .update({ active: newActive })
          .eq('id', template.id);

        if (error) {
          // Revert on error
          setTemplates((prev) =>
            prev.map((t) => (t.id === template.id ? { ...t, active: !newActive } : t))
          );
          console.error('Error updating template active status:', error);
        }
      } catch (err) {
        // Revert on error
        setTemplates((prev) =>
          prev.map((t) => (t.id === template.id ? { ...t, active: !newActive } : t))
        );
        console.error('Error updating template active status:', err);
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(template.id);
          return next;
        });
      }
    },
    [supabase]
  );

  // Toggle expanded card
  const handleCardClick = React.useCallback((templateId: string) => {
    setExpandedId((prev) => (prev === templateId ? null : templateId));
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <CircularProgress size={32} sx={{ color: 'var(--ls-color-brand)' }} />
        <span className={styles.loadingText}>Loading email templates...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.intro}>
        <h1 className={styles.title}>Email Templates</h1>
        <p className={styles.description}>
          Manage email template metadata, toggle active status, and review template details.
        </p>
      </div>

      {/* Summary cards */}
      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{totalCount}</span>
          <span className={styles.summaryLabel}>Total Templates</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{activeCount}</span>
          <span className={styles.summaryLabel}>Active</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{dripCount}</span>
          <span className={styles.summaryLabel}>Drip</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryValue}>{transactionalCount}</span>
          <span className={styles.summaryLabel}>Transactional</span>
        </div>
      </div>

      {/* Filter bar */}
      <div className={styles.filterBar}>
        <select
          className={styles.filterSelect}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
        >
          <option value="all">All Categories</option>
          <option value="drip">Drip</option>
          <option value="transactional">Transactional</option>
        </select>
        <span className={styles.filterCount}>
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Template cards */}
      <div className={styles.cardList}>
        {filteredTemplates.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>
              {categoryFilter !== 'all'
                ? `No ${categoryFilter} templates found.`
                : 'No email templates found.'}
            </p>
          </div>
        ) : (
          filteredTemplates.map((template) => {
            const isExpanded = expandedId === template.id;
            return (
              <div
                key={template.id}
                className={`${styles.card} ${isExpanded ? styles.cardExpanded : ''}`}
                onClick={() => handleCardClick(template.id)}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardHeaderLeft}>
                    <div className={styles.cardTitleRow}>
                      <h3 className={styles.cardName}>{template.name}</h3>
                      <span
                        className={`${styles.categoryBadge} ${
                          template.category === 'drip'
                            ? styles.categoryDrip
                            : styles.categoryTransactional
                        }`}
                      >
                        {template.category}
                      </span>
                    </div>
                    <p className={styles.cardSubject}>{template.subject}</p>
                    {template.preview_text && (
                      <p className={styles.cardPreview}>{template.preview_text}</p>
                    )}
                  </div>
                  <div
                    className={styles.cardHeaderRight}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className={styles.toggleContainer}>
                      <span className={styles.toggleLabel}>
                        {template.active ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={template.active}
                        onChange={(e) => handleToggleActive(template, e)}
                        disabled={togglingIds.has(template.id)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': {
                            color: 'var(--ls-color-brand-base)',
                          },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                            backgroundColor: 'var(--ls-color-brand-base)',
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Slug row - always visible */}
                <div className={styles.slugRow}>
                  <span className={styles.slugLabel}>Slug:</span>
                  <code className={styles.slugValue}>{template.slug}</code>
                </div>

                {/* Expanded detail section */}
                {isExpanded && (
                  <div className={styles.cardDetails}>
                    {template.description && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Description</span>
                        <p className={styles.detailValue}>{template.description}</p>
                      </div>
                    )}
                    <div className={styles.detailDates}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Created</span>
                        <span className={styles.detailValue}>
                          {formatDateTime(template.created_at)}
                        </span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Last Updated</span>
                        <span className={styles.detailValue}>
                          {formatDateTime(template.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default EmailTemplatesPage;
