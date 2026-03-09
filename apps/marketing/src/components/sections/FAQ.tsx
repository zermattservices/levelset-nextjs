import { Accordion } from '@/components/ui/Accordion';

export const faqItems = [
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
      'Levelset offers a 30-day free trial with full access to every feature. Click "Get Started" to choose a plan and set up your organization. No contracts — cancel anytime.',
  },
  {
    question: 'What are positional excellence ratings?',
    answer:
      'Positional excellence ratings are Levelset\'s core performance measurement system. Leaders rate each team member on a 1.0-3.0 scale across position-specific rating criteria for every position they work — iPOS, Front Counter, Primary, Bagging, and more. Ratings are collected during shifts and aggregated into rolling averages, giving you objective performance data instead of gut-feel evaluations.',
  },
  {
    question: 'Does Levelset integrate with HotSchedules?',
    answer:
      'Yes. Levelset integrates with HotSchedules to import your employees, schedules, pay rates, forecasts, and availability. The import takes minutes, so you can get started without re-entering data.',
  },
  {
    question: 'Can my team members see their own ratings?',
    answer:
      'Yes. Levelset is designed to be transparent. Team members can see their positional ratings and how their performance connects to pay — giving them a clear picture of what success looks like and how to grow.',
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
