/**
 * CTA Mode Configuration
 *
 * Controls the primary call-to-action across the entire marketing site.
 * - 'trial': Opens the pricing/plan selection modal → redirects to app.levelset.io/signup
 * - 'demo': Opens a "Request a Demo" lead capture modal → submits to /api/demo-request
 *
 * Change this single value to swap the entire site's CTA behavior.
 */
export type CTAMode = 'demo' | 'trial';

export const CTA_MODE: CTAMode = 'demo';

export const CTA_TEXT: Record<CTAMode, { button: string; subtext: string }> = {
  demo: {
    button: 'Book a Demo',
    subtext: 'See Levelset in action — no commitment.',
  },
  trial: {
    button: 'Start Your 30-Day Free Trial',
    subtext: 'No commitment — cancel anytime.',
  },
};
