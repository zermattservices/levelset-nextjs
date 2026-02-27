/**
 * Welcome onboarding email template.
 *
 * Sent after initial signup from marketing site.
 * Contains a link to continue onboarding in the dashboard.
 */

import { getResend } from '@/lib/resend';

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  onboardingToken: string;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://app.levelset.io';
}

function buildOnboardingUrl(token: string): string {
  return `${getBaseUrl()}/onboarding?token=${token}`;
}

function buildHtml(firstName: string, onboardingUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Levelset</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Levelset</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1a1a2e;">Welcome, ${firstName}!</h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a4a68;">
                Thanks for starting your free trial with Levelset. Your organization has been created and you're ready to finish setting things up.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4a68;">
                The setup takes about <strong>10 minutes</strong> and will walk you through configuring your team structure, positions, and more.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#2563eb;border-radius:8px;">
                    <a href="${onboardingUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Continue Setup
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#8888a0;">
                Your 30-day free trial includes access to all Levelset features, including Levi AI. No credit card required to get started.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#8888a0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#2563eb;word-break:break-all;">
                ${onboardingUrl}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #eee;text-align:center;">
              <p style="margin:0;font-size:12px;color:#8888a0;">
                &copy; ${new Date().getFullYear()} Levelset. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeOnboardingEmail({ to, firstName, onboardingToken }: WelcomeEmailParams) {
  const resend = getResend();
  const onboardingUrl = buildOnboardingUrl(onboardingToken);
  const html = buildHtml(firstName, onboardingUrl);

  const { data, error } = await resend.emails.send({
    from: 'Levelset <noreply@levelset.io>',
    to,
    subject: 'Welcome to Levelset \u2014 Finish Setting Up Your Account',
    html,
  });

  if (error) {
    console.error('Failed to send welcome email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
