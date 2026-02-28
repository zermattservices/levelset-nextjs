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

interface WaitlistWelcomeProps {
  firstName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://levelset.io';

export function WaitlistWelcome({ firstName }: WaitlistWelcomeProps) {
  const name = firstName || 'there';

  return (
    <Html lang="en">
      <Head />
      <Preview>Welcome to the Levelset waitlist — here's what to expect</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading as="h1" style={logoText}>
              Levelset
            </Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Hey {name}, you're on the list!
            </Heading>
            <Text style={paragraph}>
              Thanks for joining the Levelset waitlist. We're building the
              performance management platform that Chick-fil-A Operators
              actually want to use — and we're excited to have you along for
              the ride.
            </Text>
            <Text style={paragraph}>
              Here's what happens next:
            </Text>
            <Text style={listItem}>
              <strong>1.</strong> We'll review your submission and reach out
              personally to learn more about your store.
            </Text>
            <Text style={listItem}>
              <strong>2.</strong> When your spot opens up, you'll get a link
              to start your free 30-day trial — no credit card required.
            </Text>
            <Text style={listItem}>
              <strong>3.</strong> During the trial, you'll have full access to
              Levelset including Levi AI, your AI team assistant.
            </Text>
            <Button href={baseUrl} style={button}>
              Visit Levelset
            </Button>
            <Text style={footnote}>
              In the meantime, feel free to reply to this email with any
              questions. We read every message.
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

export default WaitlistWelcome;

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
