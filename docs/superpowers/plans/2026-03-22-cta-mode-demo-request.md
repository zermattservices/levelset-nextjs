# CTA Mode: Demo Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Book a Demo" CTA mode alongside the existing "Start Free Trial" mode. A single config constant swaps the entire site between the two. Demo mode opens a lead capture modal (same fields as the-approach form) instead of the pricing modal.

**Architecture:** A `CTA_MODE` constant (`'demo' | 'trial'`) controls which modal the `TrialModalProvider` renders. A new `DemoModal` component contains the lead capture form (extracted/mirrored from the-approach LeadForm). A new API route handles demo request submissions to the existing `leads` table with `source: 'demo_request'`. All existing CTA touchpoints read the mode to determine button text and behavior. The trial flow remains fully intact and restorable by changing one constant.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Supabase (leads table), Resend (emails)

---

### Task 1: Add CTA mode config constant

**Files:**
- Create: `apps/marketing/src/lib/cta-config.ts`

- [ ] **Step 1: Create the config file**

```typescript
/**
 * CTA Mode Configuration
 *
 * Controls the primary call-to-action across the entire marketing site.
 * - 'trial': Opens the pricing/plan selection modal → redirects to app.levelset.io/signup
 * - 'demo': Opens a "Request a Demo" lead capture modal → submits to /api/demo-request
 *
 * Change this single value to swap the entire site's CTA behavior.
 */
export type CTAMode = 'demo' | 'trial';

export const CTA_MODE: CTAMode = 'demo';

export const CTA_TEXT: Record<CTAMode, { button: string; subtext: string }> = {
  demo: {
    button: 'Book a Demo',
    subtext: 'See Levelset in action — no commitment.',
  },
  trial: {
    button: 'Start Your 30-Day Free Trial',
    subtext: 'No commitment — cancel anytime.',
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/marketing/src/lib/cta-config.ts
git commit -m "feat(marketing): add CTA mode config constant"
```

---

### Task 2: Create the DemoModal component

**Files:**
- Create: `apps/marketing/src/components/cta/DemoModal.tsx`

This component mirrors the LeadForm from `apps/marketing/src/app/the-approach/TheApproachPage.tsx` (lines 197-479) with these differences:
- No `activeTimeslot` prop (not an event page)
- Submit button text: "Request a Demo" (not "Claim Your Exclusive Offer")
- Success message: "Thanks, {firstName}!" / "We'll be in touch shortly to schedule your demo." (not "You're in!")
- Submits to `/api/demo-request` (not `/api/the-approach/submit`)
- No `timeslot_number` in the payload
- Wrapped in the same modal chrome as TrialModal (backdrop, close button, escape key, scroll lock, entrance animation)
- **Role field: text input** (not dropdown) — uses the `Input` component with placeholder "e.g. Director"

- [ ] **Step 1: Create DemoModal.tsx**

```tsx
'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface DemoModalProps {
  onClose: () => void;
}

export function DemoModal({ onClose }: DemoModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Lock body scroll
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Request a demo"
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Card */}
      <div
        className={`
          relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto
          bg-white rounded-2xl shadow-2xl shadow-black/20
          transition-all duration-300 ease-out
          ${isVisible
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
          }
        `}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-10
            w-8 h-8 flex items-center justify-center rounded-full
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            transition-colors duration-150
            focus:outline-none focus-visible:ring-2 focus-visible:ring-[#31664A]/40
          "
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 pt-8 pb-8 sm:px-10 sm:pt-10 sm:pb-10">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-2">
              Book a Demo
            </h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-sm mx-auto">
              See how Levelset can work for your team. We&apos;ll reach out to schedule a time.
            </p>
          </div>

          <DemoForm onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Demo Form (mirrors the-approach LeadForm)                                  */
/* -------------------------------------------------------------------------- */

function DemoForm({ onSuccess }: { onSuccess?: () => void }) {
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
    if (isOperator === false && !role.trim()) {
      setErrorMessage('Please enter your role.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/demo-request', {
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
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#31664A]/10 mb-4">
          <svg className="w-7 h-7 text-[#31664A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-heading font-bold text-gray-900 mb-2">
          Thanks, {firstName}!
        </h3>
        <p className="text-gray-500 text-sm max-w-sm mx-auto">
          We&apos;ll be in touch shortly to schedule your demo.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Are you the Operator?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOperator(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isOperator === true
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
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
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Role — text input, only shown when not operator */}
      {isOperator === false && (
        <Input
          label="Your Role"
          placeholder="e.g. Director"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
      )}

      {/* Multi-unit? */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Multi-unit?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMultiUnit(true)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all duration-150 ${
              isMultiUnit
                ? 'bg-[#31664A] text-white border-[#31664A]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
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
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            No
          </button>
        </div>
      </div>

      {/* Store Numbers */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-1.5">
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
                  className="px-3 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
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
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      {/* Submit */}
      <Button type="submit" size="lg" className="w-full !bg-[#31664A] hover:!bg-[#264D38]" disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting...' : 'Request a Demo'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/marketing/src/components/cta/DemoModal.tsx
git commit -m "feat(marketing): add DemoModal component with lead capture form"
```

---

### Task 3: Create the demo request API route

**Files:**
- Create: `apps/marketing/src/app/api/demo-request/route.ts`

This route mirrors `apps/marketing/src/app/api/the-approach/submit/route.ts` with these differences:
- Source: `'demo_request'` (not `'the_approach'`)
- No `timeslot_number` in the body or metadata
- Confirmation email subject/body adjusted for demo context
- Internal notification subject says "New demo request" instead of "New Approach lead"

- [ ] **Step 1: Create the API route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { getResendClient } from '@/lib/resend';
import { notifyLead } from '@levelset/notifications';

interface DemoRequestBody {
  first_name: string;
  last_name: string;
  email: string;
  is_operator: boolean;
  role: string;
  is_multi_unit: boolean;
  store_numbers: string[];
}

export async function POST(request: NextRequest) {
  try {
    const body: DemoRequestBody = await request.json();

    // Validate required fields
    if (!body.first_name?.trim() || !body.last_name?.trim()) {
      return NextResponse.json({ error: 'Name is required.' }, { status: 400 });
    }
    if (!body.email?.trim() || !body.email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (!body.store_numbers?.length || !body.store_numbers[0]?.trim()) {
      return NextResponse.json({ error: 'At least one store number is required.' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Enrich store numbers from CFA directory
    const enrichedLocations = [];
    for (const storeNum of body.store_numbers) {
      const cleaned = storeNum.trim();
      if (!cleaned) continue;

      const { data: matches } = await supabase
        .from('cfa_location_directory')
        .select('location_name, location_number, operator_name, state')
        .eq('location_number', cleaned)
        .limit(1);

      const match = matches?.[0];
      enrichedLocations.push({
        store_number: cleaned,
        location_name: match?.location_name || null,
        operator_name: match?.operator_name || null,
        state: match?.state || null,
      });
    }

    // Upsert lead
    const { error: dbError } = await supabase
      .from('leads')
      .upsert(
        {
          source: 'demo_request',
          first_name: body.first_name.trim(),
          last_name: body.last_name.trim(),
          email: body.email.trim().toLowerCase(),
          is_operator: body.is_operator ?? false,
          role: body.role?.trim() || null,
          is_multi_unit: body.is_multi_unit ?? false,
          locations: enrichedLocations,
          metadata: {},
          updated_at: new Date().toISOString(),
          email_sent: false,
        },
        { onConflict: 'email,source' }
      );

    if (dbError) {
      console.error('demo request upsert error:', dbError);
      return NextResponse.json(
        { error: 'Failed to save. Please try again.' },
        { status: 500 }
      );
    }

    // Send confirmation email (non-blocking)
    sendConfirmationEmail(body).catch((err) => {
      console.error('Demo request confirmation email error:', err);
    });

    // Send internal notification (non-blocking)
    sendInternalNotification(body, enrichedLocations).catch((err) => {
      console.error('Demo request internal notification error:', err);
    });

    // Notify via shared notification system
    await notifyLead({
      email: body.email.trim().toLowerCase(),
      name: `${body.first_name.trim()} ${body.last_name.trim()}`,
      source: 'demo_request',
      isOperator: body.is_operator,
      role: body.role?.trim() || undefined,
      isMultiUnit: body.is_multi_unit,
      locations: enrichedLocations.map((l) => ({
        store_number: l.store_number,
        location_name: l.location_name || undefined,
        state: l.state || undefined,
      })),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

async function sendConfirmationEmail(body: DemoRequestBody) {
  const resend = getResendClient();

  await resend.emails.send({
    from: 'Andrew at Levelset <andrew@levelset.io>',
    to: [body.email.trim().toLowerCase()],
    subject: 'Thanks for your interest in Levelset!',
    text: [
      `Hey ${body.first_name.trim()}!`,
      '',
      `Thanks for requesting a demo of Levelset. We'll be in touch shortly to find a time that works for you.`,
      '',
      `In the meantime, you can learn more at https://levelset.io`,
      '',
      `Talk soon,`,
      `Andrew Dyar`,
      `Founder, Levelset`,
    ].join('\n'),
  });

  // Mark email as sent
  const supabase = createServerSupabaseClient();
  await supabase
    .from('leads')
    .update({ email_sent: true })
    .eq('email', body.email.trim().toLowerCase())
    .eq('source', 'demo_request');
}

async function sendInternalNotification(
  body: DemoRequestBody,
  locations: Array<{ store_number: string; location_name: string | null; state: string | null }>
) {
  const resend = getResendClient();

  const locationLines = locations
    .map((l) => `  #${l.store_number}${l.location_name ? ` — ${l.location_name}` : ''}${l.state ? ` (${l.state})` : ''}`)
    .join('\n');

  await resend.emails.send({
    from: 'Levelset <notifications@levelset.io>',
    to: ['team@levelset.io'],
    subject: `New demo request: ${body.first_name} ${body.last_name}`,
    text: [
      `New demo request from the marketing site:`,
      '',
      `Name: ${body.first_name} ${body.last_name}`,
      `Email: ${body.email}`,
      `Operator: ${body.is_operator ? 'Yes' : 'No'}`,
      `Role: ${body.role || 'Not specified'}`,
      `Multi-unit: ${body.is_multi_unit ? 'Yes' : 'No'}`,
      `Locations:`,
      locationLines,
      '',
      `Submitted: ${new Date().toISOString()}`,
    ].join('\n'),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/marketing/src/app/api/demo-request/route.ts
git commit -m "feat(marketing): add demo request API route"
```

---

### Task 4: Update TrialModalProvider to support CTA mode

**Files:**
- Modify: `apps/marketing/src/components/cta/TrialModalProvider.tsx`

The provider needs to render either `TrialModal` or `DemoModal` based on `CTA_MODE`.

- [ ] **Step 1: Update TrialModalProvider**

Replace the contents of `TrialModalProvider.tsx` with:

```tsx
'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CTA_MODE } from '@/lib/cta-config';
import { TrialModal } from './TrialModal';
import { DemoModal } from './DemoModal';

interface TrialModalContextValue {
  openModal: () => void;
  closeModal: () => void;
  isOpen: boolean;
}

const TrialModalContext = createContext<TrialModalContextValue | null>(null);

export function TrialModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openModal = useCallback(() => setIsOpen(true), []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  return (
    <TrialModalContext.Provider value={{ openModal, closeModal, isOpen }}>
      {children}
      {isOpen && (
        CTA_MODE === 'demo'
          ? <DemoModal onClose={closeModal} />
          : <TrialModal onClose={closeModal} />
      )}
    </TrialModalContext.Provider>
  );
}

export function useTrialModal(): TrialModalContextValue {
  const context = useContext(TrialModalContext);
  if (!context) {
    throw new Error('useTrialModal must be used within a TrialModalProvider');
  }
  return context;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/marketing/src/components/cta/TrialModalProvider.tsx
git commit -m "feat(marketing): wire TrialModalProvider to CTA_MODE config"
```

---

### Task 5: Update CTA button text across all touchpoints

**Files:**
- Modify: `apps/marketing/src/components/cta/TrialCTA.tsx`
- Modify: `apps/marketing/src/components/layout/Header.tsx`
- Modify: `apps/marketing/src/app/pricing/PricingPageContent.tsx`
- Modify: `apps/marketing/src/components/sections/CTA.tsx`
- Modify: `apps/marketing/src/app/about/AboutCTA.tsx`
- Modify: `apps/marketing/src/components/sections/Hero.tsx` (if it has hardcoded trial text)

The key touchpoints and what changes:

- [ ] **Step 1: Update TrialCTA.tsx**

Import `CTA_MODE` and `CTA_TEXT`, then use them for the button label and subtext:

```tsx
'use client';

import { useTrialModal } from './TrialModalProvider';
import { CTA_MODE, CTA_TEXT } from '@/lib/cta-config';

interface TrialCTAProps {
  dark?: boolean;
}

export function TrialCTA({ dark = false }: TrialCTAProps) {
  const { openModal } = useTrialModal();
  const text = CTA_TEXT[CTA_MODE];

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={openModal}
        className={`
          px-8 py-3.5 rounded-xl font-semibold text-base
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2
          active:scale-[0.98]
          ${dark
            ? 'bg-white text-[#264D38] hover:bg-white/90 hover:shadow-lg hover:shadow-black/10 focus:ring-white/40 focus:ring-offset-[#264D38]'
            : 'bg-[#31664A] text-white hover:bg-[#264D38] hover:shadow-lg hover:shadow-[#31664A]/20 focus:ring-[#31664A]/40'
          }
        `}
      >
        {text.button}
      </button>
      <p className={`text-xs ${dark ? 'text-white/50' : 'text-gray-400'}`}>
        {text.subtext}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Update Header.tsx**

The Header has two places that say "Get Started" (desktop nav button at ~line 177, mobile menu button at ~line 255). These should also read from `CTA_TEXT`:

Import at top:
```tsx
import { CTA_MODE, CTA_TEXT } from '@/lib/cta-config';
```

Replace the two hardcoded "Get Started" strings:
- Desktop button (~line 179): change `Get Started` to `{CTA_MODE === 'demo' ? 'Book a Demo' : 'Get Started'}`
- Mobile button (~line 258): same change

- [ ] **Step 3: Update CTA section text**

In `apps/marketing/src/components/sections/CTA.tsx`, the surrounding text says "Start your free trial and see how...". Update to be mode-aware:

```tsx
'use client';

import { TrialCTA } from '@/components/cta/TrialCTA';
import { CTA_MODE } from '@/lib/cta-config';

export function CTA() {
  return (
    <section className="py-24 md:py-32 bg-[#1e3f2e] relative overflow-hidden">
      {/* Background depth — unchanged */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, #264D38 0%, #1a3d2d 40%, #162e23 100%)',
        }}
      />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4a9e6e]/8 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#31664A]/10 blur-3xl" />

      <div className="max-w-content mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to ditch the spreadsheets?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            {CTA_MODE === 'demo'
              ? 'See how Levelset connects your positions, discipline, and team roster in one platform.'
              : 'Start your free trial and see how Levelset connects your positions, discipline, and team roster in one platform.'}
          </p>
          <div className="flex justify-center">
            <TrialCTA dark />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Update AboutCTA.tsx**

Same pattern — the paragraph text mentions "Start your 30-day free trial":

```tsx
'use client';

import { TrialCTA } from '@/components/cta/TrialCTA';
import { CTA_MODE } from '@/lib/cta-config';

export function AboutCTA() {
  return (
    <section className="py-24 md:py-32 bg-[#1e3f2e] relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 100%, #264D38 0%, #1a3d2d 40%, #162e23 100%)',
        }}
      />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-[#4a9e6e]/8 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-[#31664A]/10 blur-3xl" />

      <div className="max-w-content mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to see Levelset in action?
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto">
            {CTA_MODE === 'demo'
              ? 'Book a demo and see every feature in action. No commitment.'
              : 'Start your 30-day free trial with full access to every feature. No contracts, cancel anytime.'}
          </p>
          <div className="flex justify-center">
            <TrialCTA dark />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Update PricingPageContent.tsx bottom CTA**

The pricing page bottom CTA button (~line 123) says "Start Your Free Trial". Read from config:

Import at top:
```tsx
import { CTA_MODE, CTA_TEXT } from '@/lib/cta-config';
```

Replace the button text (~line 126) from `Start Your Free Trial` to `{CTA_TEXT[CTA_MODE].button}`.

- [ ] **Step 6: Update FeaturePageTemplate.tsx bottom CTA**

In `apps/marketing/src/components/templates/FeaturePageTemplate.tsx`, the bottom CTA section (~line 398-420) has the text "Every trial includes full access to all features for 30 days." This should be mode-aware:

Import at top:
```tsx
import { CTA_MODE } from '@/lib/cta-config';
```

Update the paragraph (~line 415):
```tsx
<p className="text-lg text-white/60 mb-10">
  {CTA_MODE === 'demo'
    ? 'See how it works for your team — no commitment.'
    : 'Every trial includes full access to all features for 30 days.'}
</p>
```

- [ ] **Step 7: Commit**

```bash
git add apps/marketing/src/components/cta/TrialCTA.tsx apps/marketing/src/components/layout/Header.tsx apps/marketing/src/app/pricing/PricingPageContent.tsx apps/marketing/src/components/sections/CTA.tsx apps/marketing/src/app/about/AboutCTA.tsx apps/marketing/src/components/templates/FeaturePageTemplate.tsx
git commit -m "feat(marketing): update all CTA touchpoints to respect CTA_MODE"
```

---

### Task 6: Change role field to text input on the-approach form

**Files:**
- Modify: `apps/marketing/src/app/the-approach/TheApproachPage.tsx`

- [ ] **Step 1: Replace the role `<select>` dropdown with an `<Input>` text field**

In the LeadForm component (~lines 371-392), replace the role select dropdown:

```tsx
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
```

With:

```tsx
{/* Role — text input, only shown when not operator */}
{isOperator === false && (
  <Input
    label="Your Role"
    placeholder="e.g. Director"
    value={role}
    onChange={(e) => setRole(e.target.value)}
    required
  />
)}
```

Also update the validation error message in `handleSubmit` (~line 256) from `'Please select your role.'` to `'Please enter your role.'`.

- [ ] **Step 2: Commit**

```bash
git add apps/marketing/src/app/the-approach/TheApproachPage.tsx
git commit -m "refactor(marketing): change role field to text input on the-approach form"
```

---

### Task 7: Visual verification

- [ ] **Step 1: Verify demo mode**

With `CTA_MODE = 'demo'` in `cta-config.ts`:

1. Open `http://localhost:3001` — Hero CTA should say "Book a Demo" with subtext "See Levelset in action — no commitment."
2. Click "Book a Demo" — DemoModal should open with the lead capture form
3. Verify all form fields: first/last name, email, operator toggle, role (text input, conditional), multi-unit toggle, store numbers
4. Submit the form — should show success state "Thanks, {name}!" without redirecting
5. Check Header "Book a Demo" button (desktop + mobile menu)
6. Check `/pricing` — bottom CTA should say "Book a Demo"
7. Check `/about` — CTA section text should say "Book a demo..."
8. Check `/features/positional-ratings` — bottom CTA should say "See how it works..."

- [ ] **Step 2: Verify trial mode still works**

Change `CTA_MODE` to `'trial'` in `cta-config.ts`:

1. Refresh — Hero CTA should say "Start Your 30-Day Free Trial"
2. Click — TrialModal should open with pricing cards
3. All other CTA sections should show trial-related text

Change back to `'demo'`.

- [ ] **Step 3: Verify the-approach role field**

1. Open `/the-approach` (password: "levelset")
2. Role field should now be a text input (not dropdown) when "Are you the Operator?" is "No"

- [ ] **Step 4: Final commit if any adjustments needed**
