import { Resend } from 'resend';

let resendClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Missing RESEND_API_KEY environment variable');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface WaitlistNotificationParams {
  email: string;
  operatorName?: string;
  storeNumber?: string;
  isMultiUnit?: boolean;
  message?: string;
  source?: string;
}

export async function sendWaitlistNotification(params: WaitlistNotificationParams) {
  const resend = getResendClient();

  const details = [
    `Email: ${params.email}`,
    params.operatorName ? `Operator: ${params.operatorName}` : null,
    params.storeNumber ? `Store #: ${params.storeNumber}` : null,
    params.isMultiUnit !== undefined ? `Multi-unit: ${params.isMultiUnit ? 'Yes' : 'No'}` : null,
    params.message ? `Message: ${params.message}` : null,
    `Source: ${params.source || 'website'}`,
  ].filter(Boolean).join('\n');

  const isContact = params.source === 'contact';
  const subject = isContact
    ? `New contact form submission from ${params.email}`
    : `New waitlist signup: ${params.email}`;

  try {
    await resend.emails.send({
      from: 'Levelset <notifications@levelset.io>',
      to: ['team@levelset.io'],
      subject,
      text: `${isContact ? 'New contact form submission' : 'New waitlist signup'}:\n\n${details}\n\nSubmitted at: ${new Date().toISOString()}`,
    });
  } catch (error) {
    console.error('Failed to send notification email:', error);
    // Don't throw — email failure shouldn't block the form submission
  }
}
