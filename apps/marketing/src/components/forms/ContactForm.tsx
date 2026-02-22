'use client';

import { useState, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { trackEvent } from '@/lib/analytics';

export function ContactForm() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email || !message) return;

    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          operatorName: [firstName, lastName].filter(Boolean).join(' ') || undefined,
          message,
          source: 'contact',
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong');
      }

      setStatus('success');
      trackEvent('Contact', { email, source: 'contact' });
      setFirstName('');
      setLastName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="text-center py-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-soft mb-3">
          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-heading font-bold text-text-primary mb-1">
          Message sent!
        </h3>
        <p className="text-text-secondary text-sm">
          Thanks for reaching out. We&apos;ll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="First Name"
          type="text"
          placeholder="John"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />
        <Input
          label="Last Name"
          type="text"
          placeholder="Smith"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />
      </div>
      <Input
        label="Email"
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="w-full">
        <label
          htmlFor="message"
          className="block text-sm font-medium text-text-primary mb-1.5"
        >
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          placeholder="Tell us how we can help..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className="
            w-full px-4 py-3 rounded-lg
            bg-white border border-neutral-border
            text-text-primary placeholder:text-muted
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand
            resize-vertical min-h-[120px]
          "
        />
      </div>
      {status === 'error' && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  );
}
