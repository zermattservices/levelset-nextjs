'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/* -------------------------------------------------------------------------- */
/*  Types                                                                      */
/* -------------------------------------------------------------------------- */

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
  details?: string[];
}

interface Timeslot {
  id: string;
  timeslot_number: number;
  day_label: string;
  time_range: string;
  starts_at: string;
  ends_at: string;
  badge_text: string | null;
  headline: string;
  subtext: string;
  feature_cards: FeatureCard[];
}

/* -------------------------------------------------------------------------- */
/*  Icons (same SVGs used across the marketing site)                           */
/* -------------------------------------------------------------------------- */

/* Rocket Launch — matches dashboard RocketLaunchOutlined (Ratings/PEA) */
const RocketIcon = (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
  </svg>
);

/* Gavel — matches dashboard GavelOutlined (Discipline) */
const GavelIcon = (
  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
    <path d="M1 21h12v2H1zM5.24 8.07l2.83-2.83 14.14 14.14-2.83 2.83zM12.32 1l5.66 5.66-2.83 2.83-5.66-5.66zM3.83 9.48l5.66 5.66-2.83 2.83L1 12.31z" />
  </svg>
);

/* Calendar with text lines — matches dashboard EventNoteOutlined (Evaluations) */
const CalendarTextIcon = (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5M8.25 13.5h7.5M8.25 17.25h4.5" />
  </svg>
);

/* Horizontal sliders — matches dashboard TuneOutlined (Setups) */
const TuneIcon = (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
  </svg>
);

/* Target / bullseye — for Operational Excellence */
const TargetIcon = (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 17a5 5 0 100-10 5 5 0 000 10z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 13a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

/* Org Chart — hierarchical tree structure */
const OrgChartIcon = (
  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m-3-12V3M9 3H3.75A.75.75 0 003 3.75v2.5c0 .414.336.75.75.75H9M9 3h6m0 0h5.25a.75.75 0 01.75.75v2.5a.75.75 0 01-.75.75H15M9 7h6M6 15H3.75a.75.75 0 00-.75.75v2.5c0 .414.336.75.75.75H9a.75.75 0 00.75-.75v-2.5A.75.75 0 009 15H6zm12 0h-2.25a.75.75 0 00-.75.75v2.5c0 .414.336.75.75.75H18a.75.75 0 00.75-.75v-2.5a.75.75 0 00-.75-.75z" />
  </svg>
);

const ICONS: Record<string, React.ReactNode> = {
  // New keys matching dashboard icons
  rocket: RocketIcon,
  gavel: GavelIcon,
  'calendar-text': CalendarTextIcon,
  tune: TuneIcon,
  target: TargetIcon,
  'org-chart': OrgChartIcon,
  // Legacy keys (used by seed data in database) — point to updated icons
  'chart-bar': RocketIcon,
  shield: GavelIcon,
  'clipboard-check': CalendarTextIcon,
  layout: TuneIcon,
  // Unchanged icons (already match dashboard)
  users: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
  calendar: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  'file-text': (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  sparkles: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  ),
  smartphone: (
    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
};

/* -------------------------------------------------------------------------- */
/*  Timeslot auto-selection helper                                             */
/* -------------------------------------------------------------------------- */

function getCurrentTimeslot(timeslots: Timeslot[]): Timeslot {
  const now = new Date();
  // Check if we're inside any active window
  for (const slot of timeslots) {
    const start = new Date(slot.starts_at);
    const end = new Date(slot.ends_at);
    if (now >= start && now <= end) return slot;
  }
  // Between windows: find the most recent one that has ended
  let mostRecent: Timeslot | null = null;
  for (const slot of timeslots) {
    const end = new Date(slot.ends_at);
    if (now > end) {
      if (!mostRecent || end > new Date(mostRecent.ends_at)) {
        mostRecent = slot;
      }
    }
  }
  // If found a past slot, use it; otherwise default to first
  return mostRecent || timeslots[0];
}

/* -------------------------------------------------------------------------- */
/*  Password Gate                                                              */
/* -------------------------------------------------------------------------- */

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.toLowerCase().trim() === 'levelset') {
      sessionStorage.setItem('approach_unlocked', '1');
      onUnlock();
    } else {
      setError(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#f6fffa]">
      <form onSubmit={handleSubmit} className="w-full max-w-xs text-center">
        <div className="mb-8">
          <img
            src="/logos/Levelset no margin.png"
            alt="Levelset"
            className="h-8 mx-auto mb-6"
          />
          <p className="text-sm text-text-secondary">
            Enter the password to continue.
          </p>
        </div>
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          error={error ? 'Incorrect password' : undefined}
          className="text-center"
        />
        <Button type="submit" className="w-full mt-3 !bg-[#31664A] hover:!bg-[#264D38]" size="md">
          Enter
        </Button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Lead Capture Form                                                          */
/* -------------------------------------------------------------------------- */

function LeadForm({ activeTimeslot }: { activeTimeslot: number | null }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [isOperator, setIsOperator] = useState<boolean | null>(null);
  const [role, setRole] = useState('');
  const [isMultiUnit, setIsMultiUnit] = useState(false);
  const [storeNumbers, setStoreNumbers] = useState(['']);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  function handleStoreNumberChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(0, 5);
    setStoreNumbers((prev) => {
      const next = [...prev];
      next[index] = cleaned;
      return next;
    });
  }

  function addStoreNumber() {
    if (storeNumbers.length < 3) {
      setStoreNumbers((prev) => [...prev, '']);
    }
  }

  function removeStoreNumber(index: number) {
    if (storeNumbers.length > (isMultiUnit ? 2 : 1)) {
      setStoreNumbers((prev) => prev.filter((_, i) => i !== index));
    }
  }

  // When multi-unit is toggled on, ensure at least 2 fields
  useEffect(() => {
    if (isMultiUnit && storeNumbers.length < 2) {
      setStoreNumbers((prev) => [...prev, '']);
    }
    if (!isMultiUnit) {
      setStoreNumbers((prev) => [prev[0] || '']);
    }
  }, [isMultiUnit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set role when operator is selected
  useEffect(() => {
    if (isOperator === true) {
      setRole('Operator');
    } else if (isOperator === false) {
      setRole('');
    }
  }, [isOperator]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim() || isOperator === null || !storeNumbers[0]?.trim()) {
      setErrorMessage('Please fill in all required fields.');
      setStatus('error');
      return;
    }
    if (isOperator === false && !role) {
      setErrorMessage('Please select your role.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/the-approach/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          email,
          is_operator: isOperator,
          role: isOperator ? 'Operator' : role,
          is_multi_unit: isMultiUnit,
          store_numbers: storeNumbers.filter((s) => s.trim()),
          timeslot_number: activeTimeslot,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#31664A]/10 mb-4">
          <svg className="w-7 h-7 text-[#31664A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-heading font-bold text-text-primary mb-2">
          You&apos;re in!
        </h3>
        <p className="text-text-secondary text-sm max-w-sm mx-auto">
          Check your email for a confirmation from Andrew. We&apos;ll be in touch with your exclusive offer shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-md mx-auto">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name"
          placeholder="Jane"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          required
        />
        <Input
          label="Last Name"
          placeholder="Smith"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          required
        />
      </div>

      {/* Email */}
      <Input
        label="Email"
        type="email"
        placeholder="jane@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {/* Are you the Operator? */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Are you the Operator?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOperator(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isOperator === true
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setIsOperator(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isOperator === false
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Role — only shown when not operator */}
      {isOperator === false && (
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5" htmlFor="role">
            Your Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-white border border-neutral-border text-text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            required
          >
            <option value="">Select your role</option>
            <option value="Talent Director">Talent Director</option>
            <option value="Director">Director</option>
            <option value="Team Lead">Team Lead</option>
            <option value="Manager">Manager</option>
            <option value="Other">Other</option>
          </select>
        </div>
      )}

      {/* Multi-unit? */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          Multi-unit?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMultiUnit(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isMultiUnit
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => setIsMultiUnit(false)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              !isMultiUnit
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-text-secondary border-neutral-border hover:border-gray-400'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Store Numbers */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          Store Number{isMultiUnit ? 's' : ''}
        </label>
        <div className="space-y-2">
          {storeNumbers.map((num, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="01234"
                value={num}
                onChange={(e) => handleStoreNumberChange(i, e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                required={i === 0}
              />
              {isMultiUnit && storeNumbers.length > 2 && i > 0 && (
                <button
                  type="button"
                  onClick={() => removeStoreNumber(i)}
                  className="px-3 text-text-secondary hover:text-destructive transition-colors flex-shrink-0"
                  aria-label="Remove store number"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
        {isMultiUnit && storeNumbers.length < 3 && (
          <button
            type="button"
            onClick={addStoreNumber}
            className="mt-2 text-sm text-[#31664A] font-medium hover:underline"
          >
            + Add another location
          </button>
        )}
      </div>

      {/* Error */}
      {status === 'error' && errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" className="w-full !bg-[#31664A] hover:!bg-[#264D38]" disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting...' : 'Claim Your Exclusive Offer'}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                        */
/* -------------------------------------------------------------------------- */

export function TheApproachPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [activeSlot, setActiveSlot] = useState<Timeslot | null>(null);
  const [overrideSlot, setOverrideSlot] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  // Check sessionStorage for password on mount
  useEffect(() => {
    if (sessionStorage.getItem('approach_unlocked') === '1') {
      setUnlocked(true);
    }
  }, []);

  // Fetch timeslot content
  const fetchContent = useCallback(async () => {
    try {
      const res = await fetch('/api/the-approach/content');
      if (!res.ok) throw new Error('Failed to fetch');
      const { timeslots: data } = await res.json();
      setTimeslots(data);
      if (data.length > 0) {
        setActiveSlot(getCurrentTimeslot(data));
      }
    } catch (err) {
      console.error('Failed to load timeslot content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) fetchContent();
  }, [unlocked, fetchContent]);

  // Handle dropdown override
  useEffect(() => {
    setExpandedCard(null);
    if (overrideSlot !== null) {
      const slot = timeslots.find((s) => s.timeslot_number === overrideSlot);
      if (slot) setActiveSlot(slot);
    } else if (timeslots.length > 0) {
      setActiveSlot(getCurrentTimeslot(timeslots));
    }
  }, [overrideSlot, timeslots]);

  // Password gate
  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />;
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#31664A]/20 border-t-[#31664A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!activeSlot) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-text-secondary">No content available yet. Check back soon.</p>
      </div>
    );
  }

  const displaySlot = activeSlot;

  return (
    <>
      {/* Hero Section — includes timeslot selector inside */}
      <section className="relative overflow-hidden bg-[#264D38] pt-16 pb-16 md:pb-24">
        <div
          className="absolute inset-0 -z-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 0%, #31664A 0%, #1a3d2d 50%, #162e23 100%)',
          }}
        />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-[#4a9e6e]/10 blur-3xl" />
        <div className="absolute bottom-[-30%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#31664A]/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Timeslot Selector — inside hero, dark-styled */}
        <div className="relative z-10 border-b border-white/10 py-2 px-6 mb-12 md:mb-16">
          <div className="max-w-content mx-auto flex items-center justify-between gap-4">
            <span className="text-xs text-white/50 font-medium">
              {displaySlot.day_label} &middot; {displaySlot.time_range}
            </span>
            <select
              value={overrideSlot ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                setOverrideSlot(val ? Number(val) : null);
              }}
              className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white/60 focus:outline-none focus:ring-1 focus:ring-white/30"
            >
              <option value="">Auto (current time)</option>
              {timeslots.map((s) => (
                <option key={s.timeslot_number} value={s.timeslot_number}>
                  #{s.timeslot_number} — {s.day_label} {s.time_range}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            {displaySlot.badge_text && (
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-sm font-medium mb-6 backdrop-blur-sm">
                {displaySlot.badge_text}
              </div>
            )}

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-5 leading-[1.1] tracking-tight">
              {displaySlot.headline}
            </h1>

            <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
              {displaySlot.subtext}
            </p>
          </div>
        </div>
      </section>

      {/* Feature Cards — matching FeaturesOverview pattern, click to expand */}
      {displaySlot.feature_cards.length > 0 && (
        <section className="py-24 md:py-32 bg-white">
          <div className="max-w-content mx-auto px-6">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-5">
                What we&apos;ll cover
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed">
                Here&apos;s what Levelset brings to the table — built specifically for how Chick-fil-A restaurants operate.
              </p>
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-2 ${displaySlot.feature_cards.length !== 2 ? 'lg:grid-cols-3' : ''} gap-5`}>
              {displaySlot.feature_cards.map((card, i) => {
                const isExpanded = expandedCard === i;

                return (
                  <div
                    key={i}
                    onClick={() => setExpandedCard(isExpanded ? null : i)}
                    className={`group relative p-7 rounded-2xl border cursor-pointer transition-all duration-300 hover:shadow-md ${
                      isExpanded
                        ? 'bg-white border-[#31664A]/25 shadow-md ring-1 ring-[#31664A]/10'
                        : 'bg-[#f6fffa] border-[#31664A]/10 hover:border-[#31664A]/25'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-10 h-10 rounded-lg bg-[#31664A] flex items-center justify-center">
                        {ICONS[card.icon] || ICONS['chart-bar']}
                      </div>
                      <svg
                        className={`w-4 h-4 text-[#31664A]/40 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>

                    <h3 className={`text-[17px] font-heading font-bold mb-2 transition-colors ${
                      isExpanded ? 'text-[#31664A]' : 'text-text-primary group-hover:text-[#31664A]'
                    }`}>
                      {card.title}
                    </h3>

                    <p className="text-text-secondary leading-relaxed text-[15px]">
                      {card.description}
                    </p>

                    {/* Expanded details */}
                    {isExpanded && card.details && card.details.length > 0 && (
                      <ul className="mt-5 pt-5 border-t border-[#31664A]/10 space-y-3">
                        {card.details.map((detail, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-[14px] text-text-secondary leading-relaxed">
                            <svg className="w-4 h-4 text-[#31664A] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Lead Capture Form */}
      <section className="py-16 md:py-20 bg-[#f6fffa]">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-3">
                Claim Your Exclusive Offer
              </h2>
              <p className="text-text-secondary text-sm">
                Leave your info and we&apos;ll send you everything you need to get started — exclusively for Approach attendees.
              </p>
            </div>
            <LeadForm activeTimeslot={displaySlot.timeslot_number} />
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 md:py-16 bg-white">
        <div className="max-w-content mx-auto px-6 text-center">
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Built exclusively for Chick-fil-A Operators. Levelset is already helping restaurants manage team performance from day one.
          </p>
        </div>
      </section>
    </>
  );
}
