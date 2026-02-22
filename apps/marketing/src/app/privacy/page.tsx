import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Levelset.',
};

export default function PrivacyPage() {
  return (
    <section className="pt-32 pb-20 md:pt-40 md:pb-28">
      <div className="max-w-narrow mx-auto px-6">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-lg max-w-none text-text-secondary [&_h2]:text-text-primary [&_h2]:font-heading [&_h2]:font-bold [&_h2]:text-xl [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-text-primary [&_h3]:font-heading [&_h3]:font-bold [&_h3]:text-lg [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4 [&_p]:leading-relaxed [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
          <p className="text-sm text-muted mb-8">Last updated: February 22, 2026</p>

          <h2>1. Introduction</h2>
          <p>
            Welcome to Levelset (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website levelset.io and use our services.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>Information You Provide</h3>
          <p>We may collect information that you voluntarily provide to us, including:</p>
          <ul>
            <li>Name and email address when joining our waitlist or contacting us</li>
            <li>Business information such as operator name and store number</li>
            <li>Any messages or feedback you send through our contact form</li>
          </ul>

          <h3>Information Automatically Collected</h3>
          <p>When you visit our website, we may automatically collect certain information, including:</p>
          <ul>
            <li>Browser type and version</li>
            <li>Operating system</li>
            <li>Pages visited and time spent</li>
            <li>Referring website</li>
            <li>IP address</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Process your waitlist registration and contact inquiries</li>
            <li>Send you updates about Levelset (with your consent)</li>
            <li>Improve our website and services</li>
            <li>Analyze usage patterns and trends</li>
            <li>Protect against fraudulent or unauthorized activity</li>
          </ul>

          <h2>4. Sharing Your Information</h2>
          <p>
            We do not sell, trade, or otherwise transfer your personal information to third parties. We may share information with trusted service providers who assist us in operating our website and services, provided they agree to keep your information confidential.
          </p>

          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2>6. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your personal information</li>
            <li>Opt out of marketing communications</li>
          </ul>

          <h2>7. Cookies and Tracking</h2>
          <p>
            We use cookies and similar tracking technologies (such as Facebook Pixel) to track activity on our website and improve your experience. You can manage cookie preferences through your browser settings.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
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
