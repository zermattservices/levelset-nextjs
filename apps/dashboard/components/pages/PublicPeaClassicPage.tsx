import * as React from 'react';
import Image from 'next/image';
import { Box, Typography } from '@mui/material';
import { PEAClassic } from '@/components/CodeComponents/PEAClassic';
import type { MobileLocation } from '@/lib/mobile-location';
import sty from './PublicPeaClassicPage.module.css';

interface PublicPeaClassicPageProps {
  location: MobileLocation;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function PublicPeaClassicPage({ location }: PublicPeaClassicPageProps) {
  return (
    <div className={sty.root}>
      {/* Header with Levelset branding and location name */}
      <header className={sty.header}>
        <div className={sty.headerContent}>
          <div className={sty.logoContainer}>
            <Image
              src="/logos/Levelset no margin.png"
              alt="Levelset"
              width={100}
              height={28}
              style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: 100 }}
              priority
            />
          </div>
          <Typography
            component="h1"
            className={sty.locationName}
            sx={{
              fontFamily,
              fontSize: { xs: 16, sm: 18, md: 18 },
              fontWeight: 700,
              color: 'var(--ls-color-neutral-soft-foreground)',
            }}
          >
            {location.name ?? 'Ratings Summary'}
          </Typography>
          {/* Empty spacer to balance the logo */}
          <div className={sty.headerSpacer} />
        </div>
      </header>

      {/* Main content - PEA Classic table */}
      <main className={sty.main}>
        <div className={sty.tableContainer}>
          <PEAClassic
            locationId={location.id}
            density="comfortable"
            defaultTab="overview"
            defaultArea="FOH"
            compactControls
            fillHeight
          />
        </div>
      </main>

      {/* Footer */}
      <footer className={sty.footer}>
        <Typography
          sx={{
            fontFamily,
            fontSize: 11,
            color: 'var(--ls-color-disabled-text)',
            textAlign: 'center',
          }}
        >
          Powered by Levelset
        </Typography>
      </footer>
    </div>
  );
}

export default PublicPeaClassicPage;
