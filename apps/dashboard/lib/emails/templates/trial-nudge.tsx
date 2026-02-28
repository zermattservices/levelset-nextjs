import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Heading,
  Hr,
  Preview,
} from '@react-email/components';

interface TrialNudgeProps {
  firstName?: string;
}

const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://app.levelset.io';

export function TrialNudge({ firstName }: TrialNudgeProps) {
  const name = firstName || 'there';

  return (
    <Html lang="en">
      <Head />
      <Preview>Your Levelset trial is ready — start in under 10 minutes</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading as="h1" style={logoText}>
              Levelset
            </Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Ready to give it a try, {name}?
            </Heading>
            <Text style={paragraph}>
              It's been about a week since you joined the Levelset waitlist,
              and your spot is still available. Getting started takes less
              than 10 minutes.
            </Text>

            <Text style={paragraph}>
              Here's what you'll set up:
            </Text>
            <Text style={listItem}>
              <strong>Your organization</strong> — name, logo, and basic
              details.
            </Text>
            <Text style={listItem}>
              <strong>Your locations</strong> — add each store you manage.
            </Text>
            <Text style={listItem}>
              <strong>Your team</strong> — import or add team members and
              their roles.
            </Text>
            <Text style={listItem}>
              <strong>Your first ratings</strong> — see the evaluation
              system in action right away.
            </Text>

            <Text style={paragraph}>
              Your 30-day trial includes everything — performance
              tracking, team analytics, and full access to Levi AI. No
              credit card needed.
            </Text>

            <Button href={`${appUrl}/signup`} style={button}>
              Start Your Free Trial
            </Button>

            <Text style={footnote}>
              Not ready yet? No worries — your spot isn't going anywhere.
              Reply to this email if you have questions.
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={footer}>
            <Text style={footerText}>
              Levelset &middot; Built for Chick-fil-A Operators
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default TrialNudge;

// Styles
const body: React.CSSProperties = {
  backgroundColor: '#f4f5f7',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  margin: '40px auto',
  maxWidth: '560px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};

const header: React.CSSProperties = {
  backgroundColor: '#1a1a2e',
  padding: '32px 40px',
  textAlign: 'center' as const,
};

const logoText: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 700,
  letterSpacing: '-0.5px',
  margin: 0,
};

const content: React.CSSProperties = {
  padding: '40px',
};

const heading: React.CSSProperties = {
  color: '#1a1a2e',
  fontSize: '22px',
  fontWeight: 600,
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  color: '#4a4a68',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
};

const listItem: React.CSSProperties = {
  color: '#4a4a68',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '4px',
};

const button: React.CSSProperties = {
  backgroundColor: '#31664A',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: 600,
  padding: '14px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  margin: '8px 0 24px',
};

const footnote: React.CSSProperties = {
  color: '#8888a0',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: 0,
};

const hr: React.CSSProperties = {
  borderColor: '#eeeeee',
  margin: 0,
};

const footer: React.CSSProperties = {
  padding: '24px 40px',
  textAlign: 'center' as const,
};

const footerText: React.CSSProperties = {
  color: '#8888a0',
  fontSize: '12px',
  margin: 0,
};
