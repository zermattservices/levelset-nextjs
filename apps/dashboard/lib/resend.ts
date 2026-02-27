/**
 * Resend email client factory.
 *
 * Usage:
 *   import { getResend } from '@/lib/resend';
 *   const resend = getResend();
 *   await resend.emails.send({ ... });
 *
 * Requires RESEND_API_KEY environment variable.
 */

import { Resend } from 'resend';

let instance: Resend | null = null;

export function getResend(): Resend {
  if (!instance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    instance = new Resend(apiKey);
  }
  return instance;
}
