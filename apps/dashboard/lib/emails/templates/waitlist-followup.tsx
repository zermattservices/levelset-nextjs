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

interface WaitlistFollowupProps {
  firstName?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_MARKETING_URL || 'https://levelset.io';

export function WaitlistFollowup({ firstName }: WaitlistFollowupProps) {
  const name = firstName || 'there';

  return (
    <Html lang="en">
      <Head />
      <Preview>Quick update from Levelset — here's what makes us different</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Heading as="h1" style={logoText}>
              Levelset
            </Heading>
          </Section>

          <Section style={content}>
            <Heading as="h2" style={heading}>
              Still with us, {name}?
            </Heading>
            <Text style={paragraph}>
              A few days ago you signed up for the Levelset waitlist. We
              wanted to follow up with a bit more about what we're building
              and why it matters.
            </Text>

            <Text style={subheading}>
              <strong>Performance tracking that actually works</strong>
            </Text>
            <Text style={paragraph}>
              Levelset replaces the spreadsheet-and-clipboard approach to
              team evaluations with a real system. Your leaders rate team
              members on the metrics that matter, and Levelset turns that
              data into trends, insights, and action items.
            </Text>

            <Text style={subheading}>
              <strong>Meet Levi, your AI team assistant</strong>
            </Text>
            <Text style={paragraph}>
              Ask Levi about any team member's performance, get coaching
              suggestions, and surface patterns you'd never catch manually.
              It's like having a leadership consultant on call 24/7.
            </Text>

            <Text style={subheading}>
              <strong>Built specifically for CFA Operators</strong>
            </Text>
            <Text style={paragraph}>
              We're not a generic HR tool. Levelset is designed around the
              way Chick-fil-A restaurants actually operate — from daily
              position ratings to development pathways.
            </Text>

            <Button href={baseUrl} style={button}>
              Learn More
            </Button>

            <Text style={footnote}>
              Questions? Just hit reply — we're happy to chat.
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

export default WaitlistFollowup;

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

const subheading: React.CSSProperties = {
  color: '#1a1a2e',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 4px',
};

const paragraph: React.CSSProperties = {
  color: '#4a4a68',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px',
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
