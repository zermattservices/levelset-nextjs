'use client';

import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface DemoModalProps {
  onClose: () => void;
}

export function DemoModal({ onClose }: DemoModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

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
      <div
        className={`
          absolute inset-0 bg-black/60 backdrop-blur-sm
          transition-opacity duration-300 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

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
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 mb-2">
              Book a Demo
            </h2>
            <p className="text-gray-500 text-sm sm:text-base max-w-sm mx-auto">
              See how Levelset can work for your team. We&apos;ll reach out to schedule a time.
            </p>
          </div>

          <DemoForm />
        </div>
      </div>
    </div>
  );
}

function DemoForm() {
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

  useEffect(() => {
    if (isMultiUnit && storeNumbers.length < 2) {
      setStoreNumbers((prev) => [...prev, '']);
    }
    if (!isMultiUnit) {
      setStoreNumbers((prev) => [prev[0] || '']);
    }
  }, [isMultiUnit]); // eslint-disable-line react-hooks/exhaustive-deps

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

      <Input
        label="Email"
        type="email"
        placeholder="jane@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Are you the Operator?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOperator(true)}
            aria-pressed={isOperator === true}
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
            aria-pressed={isOperator === false}
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

      {isOperator === false && (
        <Input
          label="Your Role"
          placeholder="e.g. Director"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        />
      )}

      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Multi-unit?
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsMultiUnit(true)}
            aria-pressed={isMultiUnit}
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
            aria-pressed={!isMultiUnit}
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

      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}

      <Button type="submit" size="lg" className="w-full !bg-[#31664A] hover:!bg-[#264D38]" disabled={status === 'loading'}>
        {status === 'loading' ? 'Submitting...' : 'Request a Demo'}
      </Button>
    </form>
  );
}
