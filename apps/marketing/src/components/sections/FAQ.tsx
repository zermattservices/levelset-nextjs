import { Accordion } from '@/components/ui/Accordion';

const faqItems = [
  {
    question: 'What is Levelset?',
    answer:
      'Levelset is a team management platform built exclusively for Chick-fil-A operators. It replaces the spreadsheets and paper trackers you use today with position-by-position ratings, a connected discipline system, and a complete team roster — giving your leadership team one clear picture of how your people are performing.',
  },
  {
    question: 'Who is Levelset for?',
    answer:
      'Levelset is built for Chick-fil-A operators and their leadership teams. Whether you run a single restaurant or manage multiple locations, Levelset gives your directors, team leads, and trainers the tools they need to rate performance, manage accountability, and develop your people — without the spreadsheet chaos.',
  },
  {
    question: 'How do I get access?',
    answer:
      'Levelset is currently in early access with a small group of operators. Join the waitlist and we\'ll reach out when we\'re ready to bring you on. Early access operators help shape the product and get priority onboarding.',
  },
];

export function FAQ() {
  return (
    <section id="faq" className="py-24 md:py-28 bg-[#f6fffa]">
      <div className="max-w-content mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-text-primary mb-4">
              Frequently asked questions
            </h2>
            <p className="text-lg text-text-secondary">
              Everything you need to know about Levelset.
            </p>
          </div>

          <Accordion items={faqItems} />
        </div>
      </div>
    </section>
  );
}
