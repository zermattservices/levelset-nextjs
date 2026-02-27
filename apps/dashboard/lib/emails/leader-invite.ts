/**
 * Leader invite email template.
 *
 * Sent when an operator/admin invites leaders during onboarding Step 7.
 * Contains a link to /signup?invite=<token> to create their account.
 */

import { getResend } from '@/lib/resend';

interface LeaderInviteParams {
  to: string;
  firstName: string;
  inviterName: string;
  orgName: string;
  roleName: string;
  inviteToken: string;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://app.levelset.io';
}

function buildInviteUrl(token: string): string {
  return `${getBaseUrl()}/signup?invite=${token}`;
}

function buildHtml(params: {
  firstName: string;
  inviterName: string;
  orgName: string;
  roleName: string;
  inviteUrl: string;
}): string {
  const { firstName, inviterName, orgName, roleName, inviteUrl } = params;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're Invited to Levelset</title>
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
              <h2 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#1a1a2e;">
                You're invited, ${firstName}!
              </h2>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4a4a68;">
                <strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> on Levelset as a <strong>${roleName}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4a4a68;">
                Levelset helps your team track performance, manage development, and stay aligned. Click below to create your account and get started.
              </p>
              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
                <tr>
                  <td style="background:#2563eb;border-radius:8px;">
                    <a href="${inviteUrl}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#8888a0;">
                This invite link is unique to you. You can sign up with Google or create a password.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#8888a0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#2563eb;word-break:break-all;">
                ${inviteUrl}
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

export async function sendLeaderInviteEmail(params: LeaderInviteParams) {
  const resend = getResend();
  const inviteUrl = buildInviteUrl(params.inviteToken);
  const html = buildHtml({
    firstName: params.firstName,
    inviterName: params.inviterName,
    orgName: params.orgName,
    roleName: params.roleName,
    inviteUrl,
  });

  const { data, error } = await resend.emails.send({
    from: 'Levelset <noreply@levelset.io>',
    to: params.to,
    subject: `${params.inviterName} invited you to Levelset`,
    html,
  });

  if (error) {
    console.error('Failed to send invite email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
