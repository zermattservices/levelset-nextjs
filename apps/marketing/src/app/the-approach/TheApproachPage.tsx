'use client';

import { useState, useEffect, FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

/* -------------------------------------------------------------------------- */
/*  Lead Capture Form                                                          */
/* -------------------------------------------------------------------------- */

function LeadForm() {
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
      setErrorMessage('Please enter your role.');
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
          timeslot_number: null,
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
        {status === 'loading' ? 'Submitting...' : 'Book a Demo'}
      </Button>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main Page Component                                                        */
/* -------------------------------------------------------------------------- */

export function TheApproachPage() {
  return (
    <>
      {/* Hero Section */}
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

        <div className="max-w-content mx-auto px-6 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-white mb-5 leading-[1.1] tracking-tight">
              See Levelset in Action
            </h1>

            <p className="text-base md:text-lg text-white/70 leading-relaxed max-w-xl mx-auto">
              Built exclusively for Chick-fil-A restaurants. See how Levelset helps your leadership team manage performance, accountability, and development — all in one platform.
            </p>
          </div>
        </div>
      </section>

      {/* Lead Capture Form */}
      <section className="py-16 md:py-20 bg-[#f6fffa]">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-text-primary mb-3">
                Book a Demo
              </h2>
              <p className="text-text-secondary text-sm">
                Leave your info and we&apos;ll send you everything you need to get started — exclusively for Approach attendees.
              </p>
            </div>
            <LeadForm />
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
