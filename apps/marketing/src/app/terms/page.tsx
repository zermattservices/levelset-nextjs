import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and Conditions for Levelset.',
};

export default function TermsPage() {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="max-w-narrow mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-8">
          Terms &amp; Conditions
        </h1>

        <div className="prose prose-lg max-w-none text-text-secondary [&_h2]:text-text-primary [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-text-primary [&_h3]:font-heading [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
          <p className="text-sm text-muted mb-8">Last updated: February 22, 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing and using Levelset (&quot;the Service&quot;), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use our Service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Levelset is a team management platform designed for restaurant operators. The Service includes performance rating tools, scheduling features, AI-powered insights, and related functionality. The Service is currently in early access and may change without notice.
          </p>

          <h2>3. Waitlist and Early Access</h2>
          <p>
            By joining our waitlist, you agree to receive communications from Levelset regarding the Service, including updates, availability, and related information. You may opt out of these communications at any time.
          </p>

          <h2>4. User Obligations</h2>
          <p>When using the Service, you agree to:</p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Not use the Service for any unlawful purpose</li>
            <li>Not attempt to gain unauthorized access to any part of the Service</li>
            <li>Not interfere with or disrupt the Service</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            All content, features, and functionality of the Service — including text, graphics, logos, and software — are the exclusive property of Levelset and are protected by copyright, trademark, and other intellectual property laws.
          </p>

          <h2>6. Data and Privacy</h2>
          <p>
            Your use of the Service is also governed by our{' '}
            <a href="/privacy" className="text-brand hover:text-brand-hover underline">
              Privacy Policy
            </a>
            . By using the Service, you consent to the collection and use of information as described in our Privacy Policy.
          </p>

          <h2>7. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
          </p>

          <h2>8. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Levelset shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.
          </p>

          <h2>9. Changes to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating the &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated Terms.
          </p>

          <h2>10. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law provisions.
          </p>

          <h2>11. Contact</h2>
          <p>
            For questions about these Terms, please contact us at{' '}
            <a href="mailto:team@levelset.io" className="text-brand hover:text-brand-hover underline">
              team@levelset.io
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
