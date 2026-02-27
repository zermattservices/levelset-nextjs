import * as React from 'react';
import styles from './InviteLeadersStep.module.css';

interface LeaderEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface InviteLeadersStepProps {
  orgId: string;
  accessToken: string;
  leaders: LeaderEmployee[];
  onComplete: (data: { invitedCount: number }) => void;
  onSkip: () => void;
  onBack?: () => void;
}

interface InviteRow {
  employeeId: string;
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  selected: boolean;
}

export function InviteLeadersStep({
  orgId,
  accessToken,
  leaders,
  onComplete,
  onSkip,
  onBack,
}: InviteLeadersStepProps) {
  const [rows, setRows] = React.useState<InviteRow[]>(() =>
    leaders.map(l => ({
      employeeId: l.id,
      firstName: l.firstName,
      lastName: l.lastName,
      role: l.role,
      email: l.email || '',
      selected: true,
    }))
  );
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const selectedCount = rows.filter(r => r.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  const toggleAll = () => {
    const newVal = !allSelected;
    setRows(prev => prev.map(r => ({ ...r, selected: newVal })));
  };

  const toggleRow = (index: number) => {
    setRows(prev =>
      prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r))
    );
  };

  const updateEmail = (index: number, email: string) => {
    setRows(prev =>
      prev.map((r, i) => (i === index ? { ...r, email } : r))
    );
  };

  const handleSubmit = async () => {
    setError(null);

    const selected = rows.filter(r => r.selected);
    if (selected.length === 0) {
      setError('Select at least one leader to invite, or click "Skip for now".');
      return;
    }

    // Validate emails
    const missingEmails = selected.filter(r => !r.email.trim());
    if (missingEmails.length > 0) {
      setError(
        `Please provide an email for ${missingEmails.map(r => `${r.firstName} ${r.lastName}`).join(', ')}`
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = selected.filter(r => !emailRegex.test(r.email.trim()));
    if (invalidEmails.length > 0) {
      setError(
        `Invalid email for ${invalidEmails.map(r => `${r.firstName} ${r.lastName}`).join(', ')}`
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/onboarding/invite-leaders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          orgId,
          invites: selected.map(r => ({
            employeeId: r.employeeId,
            email: r.email.trim(),
            firstName: r.firstName,
            lastName: r.lastName,
            role: r.role,
          })),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || 'Failed to send invitations');
      }

      const data = await res.json();
      onComplete({ invitedCount: data.sentCount || selected.length });
    } catch (err: any) {
      setError(err.message || 'Failed to send invitations');
      setIsSubmitting(false);
    }
  };

  if (leaders.length === 0) {
    return (
      <div>
        <div className={styles.card}>
          <h3 className={styles.sectionTitle}>Invite Your Leadership Team</h3>
          <p className={styles.sectionDescription}>
            No leaders were identified from the previous step. You can invite team members later
            from <strong>Settings &gt; Users &amp; Access</strong>.
          </p>
        </div>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={() => onComplete({ invitedCount: 0 })}
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.card}>
        <h3 className={styles.sectionTitle}>Invite Your Leadership Team</h3>
        <p className={styles.sectionDescription}>
          Send invites to your leaders so they can access Levelset. They'll receive an email
          with a link to create their account.
        </p>

        <div className={styles.infoBanner}>
          <span className={styles.infoBannerIcon}>&#9432;</span>
          <span>
            You can always invite more team members later in <strong>Settings &gt; Users &amp; Access</strong>.
          </span>
        </div>

        {/* Select All */}
        <div className={styles.selectAllRow}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={allSelected}
              onChange={toggleAll}
            />
            <span className={styles.selectAllText}>
              Select All ({rows.length})
            </span>
          </label>
        </div>

        {/* Leader rows */}
        <div className={styles.leaderList}>
          {rows.map((row, index) => (
            <div
              key={row.employeeId}
              className={`${styles.leaderRow} ${row.selected ? styles.leaderRowSelected : ''}`}
            >
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={row.selected}
                  onChange={() => toggleRow(index)}
                />
              </label>
              <div className={styles.leaderInfo}>
                <div className={styles.leaderNameRow}>
                  <span className={styles.leaderName}>
                    {row.firstName} {row.lastName}
                  </span>
                  <span className={styles.roleBadge}>{row.role}</span>
                </div>
                <input
                  type="email"
                  className={styles.emailInput}
                  value={row.email}
                  onChange={e => updateEmail(index, e.target.value)}
                  placeholder="Email address"
                  disabled={!row.selected}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.footerRow}>
        {onBack && (
          <button type="button" className={styles.stepBackBtn} onClick={onBack}>
            &#8592; Back
          </button>
        )}
        <button
          type="button"
          className={styles.skipLink}
          onClick={onSkip}
        >
          Skip for now
        </button>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isSubmitting || selectedCount === 0}
        >
          {isSubmitting ? 'Sending...' : `Invite ${selectedCount} ${selectedCount === 1 ? 'Person' : 'People'}`}
        </button>
      </div>
    </div>
  );
}
