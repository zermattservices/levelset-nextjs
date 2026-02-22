'use client';

import { useState, FormEvent } from 'react';
import { trackLead } from '@/lib/analytics';

type Step = 'email' | 'operator' | 'store' | 'multiUnit';

const STEPS: Step[] = ['email', 'operator', 'store', 'multiUnit'];

export function WaitlistForm({ dark = false }: { dark?: boolean }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [operatorName, setOperatorName] = useState('');
  const [storeNumber, setStoreNumber] = useState('');
  const [isMultiUnit, setIsMultiUnit] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const stepIndex = STEPS.indexOf(step);

  async function submit() {
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          operatorName: operatorName || undefined,
          storeNumber: storeNumber || undefined,
          isMultiUnit,
          source: 'website',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
      trackLead({ email, source: 'website' });
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  function advance() {
    const next = STEPS[stepIndex + 1];
    if (next) {
      setStep(next);
    } else {
      submit();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (step === 'email' && !email) return;
    advance();
  }

  function skip() {
    advance();
  }

  if (status === 'success') {
    return (
      <div className={`text-center py-6 ${dark ? 'text-white' : ''}`}>
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${dark ? 'bg-white/20' : 'bg-[#31664A]/10'} mb-3`}>
          <svg className={`w-6 h-6 ${dark ? 'text-white' : 'text-[#31664A]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className={`text-lg font-heading font-bold mb-1 ${dark ? 'text-white' : 'text-text-primary'}`}>
          You&apos;re on the list!
        </h3>
        <p className={`text-sm ${dark ? 'text-white/70' : 'text-text-secondary'}`}>
          We&apos;ll be in touch soon with updates on Levelset.
        </p>
      </div>
    );
  }

  // Progress dots
  const progressDots = (
    <div className="flex items-center justify-center gap-1.5 mb-5">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`h-1 rounded-full transition-all duration-300 ${
            i <= stepIndex
              ? dark ? 'bg-white w-6' : 'bg-[#31664A] w-6'
              : dark ? 'bg-white/20 w-3' : 'bg-gray-300 w-3'
          }`}
        />
      ))}
    </div>
  );

  // Dark variant (hero)
  if (dark) {
    return (
      <div className="w-full max-w-xl mx-auto">
        {stepIndex > 0 && progressDots}
        <form onSubmit={handleSubmit}>
          {step === 'email' && (
            <div className="flex flex-col sm:flex-row gap-3 animate-fade-up">
              <input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-base backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 focus:bg-white/15"
              />
              <button
                type="submit"
                className="px-8 py-3.5 rounded-xl bg-white text-[#264D38] font-semibold text-base whitespace-nowrap transition-all duration-200 hover:bg-white/90 hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
              >
                Join Waitlist
              </button>
            </div>
          )}

          {step === 'operator' && (
            <div className="animate-fade-up">
              <p className="text-white/60 text-sm mb-3">One more thing — what&apos;s your name?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  autoFocus
                  className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-base backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 focus:bg-white/15"
                />
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-xl bg-white text-[#264D38] font-semibold text-base whitespace-nowrap transition-all duration-200 hover:bg-white/90 hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
                >
                  Next
                </button>
              </div>
              <button type="button" onClick={skip} className="text-white/40 hover:text-white/60 text-sm mt-2 transition-colors">
                Skip
              </button>
            </div>
          )}

          {step === 'store' && (
            <div className="animate-fade-up">
              <p className="text-white/60 text-sm mb-3">What&apos;s your store number?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="e.g. 04215"
                  value={storeNumber}
                  onChange={(e) => setStoreNumber(e.target.value)}
                  autoFocus
                  className="flex-1 px-5 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 text-base backdrop-blur-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40 focus:bg-white/15"
                />
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-xl bg-white text-[#264D38] font-semibold text-base whitespace-nowrap transition-all duration-200 hover:bg-white/90 hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
                >
                  Next
                </button>
              </div>
              <button type="button" onClick={skip} className="text-white/40 hover:text-white/60 text-sm mt-2 transition-colors">
                Skip
              </button>
            </div>
          )}

          {step === 'multiUnit' && (
            <div className="animate-fade-up">
              <p className="text-white/60 text-sm mb-4">Last one — do you manage multiple locations?</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => { setIsMultiUnit(true); submit(); }}
                  className={`px-8 py-3.5 rounded-xl font-semibold text-base transition-all duration-200 active:scale-[0.98] ${
                    'bg-white text-[#264D38] hover:bg-white/90 hover:shadow-lg hover:shadow-black/10'
                  }`}
                >
                  Yes, multiple
                </button>
                <button
                  type="button"
                  onClick={() => { setIsMultiUnit(false); submit(); }}
                  className="px-8 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-base transition-all duration-200 hover:bg-white/15 active:scale-[0.98] backdrop-blur-sm"
                >
                  Just one
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm text-red-300 mt-3 text-center">{errorMessage}</p>
          )}
        </form>
      </div>
    );
  }

  // Light variant (CTA card) — mirrors hero layout with inverted colors
  return (
    <div className="w-full max-w-xl mx-auto" id="waitlist">
      {stepIndex > 0 && progressDots}
      <form onSubmit={handleSubmit}>
        {step === 'email' && (
          <div className="flex flex-col sm:flex-row gap-3 animate-fade-up">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="flex-1 px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-text-primary placeholder:text-gray-400 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31664A]/30 focus:border-[#31664A]/40 focus:bg-white"
            />
            <button
              type="submit"
              className="px-8 py-3.5 rounded-xl bg-[#31664A] text-white font-semibold text-base whitespace-nowrap transition-all duration-200 hover:bg-[#264D38] hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
            >
              Join Waitlist
            </button>
          </div>
        )}

        {step === 'operator' && (
          <div className="animate-fade-up">
            <p className="text-gray-500 text-sm mb-3">One more thing — what&apos;s your name?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Your name"
                value={operatorName}
                onChange={(e) => setOperatorName(e.target.value)}
                autoFocus
                className="flex-1 px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-text-primary placeholder:text-gray-400 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31664A]/30 focus:border-[#31664A]/40 focus:bg-white"
              />
              <button
                type="submit"
                className="px-8 py-3.5 rounded-xl bg-[#31664A] text-white font-semibold text-base whitespace-nowrap transition-all duration-200 hover:bg-[#264D38] hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
              >
                Next
              </button>
            </div>
            <button type="button" onClick={skip} className="text-gray-400 hover:text-gray-600 text-sm mt-2 transition-colors">
              Skip
            </button>
          </div>
        )}

        {step === 'store' && (
          <div className="animate-fade-up">
            <p className="text-gray-500 text-sm mb-3">What&apos;s your store number?</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. 04215"
                value={storeNumber}
                onChange={(e) => setStoreNumber(e.target.value)}
                autoFocus
                className="flex-1 px-5 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-text-primary placeholder:text-gray-400 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#31664A]/30 focus:border-[#31664A]/40 focus:bg-white"
              />
              <button
                type="submit"
                className="px-8 py-3.5 rounded-xl bg-[#31664A] text-white font-semibold text-base whitespace-nowrap transition-all duration-200 hover:bg-[#264D38] hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
              >
                Next
              </button>
            </div>
            <button type="button" onClick={skip} className="text-gray-400 hover:text-gray-600 text-sm mt-2 transition-colors">
              Skip
            </button>
          </div>
        )}

        {step === 'multiUnit' && (
          <div className="animate-fade-up">
            <p className="text-gray-500 text-sm mb-4">Last one — do you manage multiple locations?</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => { setIsMultiUnit(true); submit(); }}
                className="px-8 py-3.5 rounded-xl bg-[#31664A] text-white font-semibold text-base transition-all duration-200 hover:bg-[#264D38] hover:shadow-lg hover:shadow-black/10 active:scale-[0.98]"
              >
                Yes, multiple
              </button>
              <button
                type="button"
                onClick={() => { setIsMultiUnit(false); submit(); }}
                className="px-8 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-text-primary font-semibold text-base transition-all duration-200 hover:bg-gray-100 active:scale-[0.98]"
              >
                Just one
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <p className="text-sm text-red-600 mt-3 text-center">{errorMessage}</p>
        )}

        {status === 'loading' && (
          <div className="flex justify-center mt-4">
            <div className="w-5 h-5 border-2 border-[#31664A]/30 border-t-[#31664A] rounded-full animate-spin" />
          </div>
        )}
      </form>
      <p className="text-xs text-gray-400 text-center mt-4">
        No spam, ever. We&apos;ll only reach out with Levelset updates.
      </p>
    </div>
  );
}
