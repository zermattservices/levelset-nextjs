import type { Metadata } from 'next';
import { ContactForm } from '@/components/forms/ContactForm';
import { FAQ } from '@/components/sections/FAQ';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with the Levelset team. We\'d love to hear from you.',
};

export default function ContactPage() {
  return (
    <>
      <section className="pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="max-w-content mx-auto px-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-4">
                Get in touch
              </h1>
              <p className="text-lg text-text-secondary">
                Have a question or want to learn more? Drop us a line and we&apos;ll
                get back to you as soon as we can.
              </p>
            </div>

            <div className="flex justify-center">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>

      <FAQ />
    </>
  );
}
