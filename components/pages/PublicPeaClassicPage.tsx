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
              width={140}
              height={40}
              style={{ objectFit: 'contain', width: 'auto', height: 'auto', maxWidth: 140 }}
              priority
            />
          </div>
          <div className={sty.locationInfo}>
            <Typography
              component="h1"
              sx={{
                fontFamily,
                fontSize: { xs: 18, sm: 24 },
                fontWeight: 700,
                color: '#111827',
                textAlign: 'center',
              }}
            >
              {location.name ?? 'Ratings Summary'}
            </Typography>
            {location.location_number && (
              <Typography
                sx={{
                  fontFamily,
                  fontSize: { xs: 12, sm: 14 },
                  fontWeight: 500,
                  color: '#6b7280',
                  textAlign: 'center',
                }}
              >
                #{location.location_number}
              </Typography>
            )}
          </div>
        </div>
      </header>

      {/* Main content - PEA Classic table */}
      <main className={sty.main}>
        <Box
          sx={{
            width: '100%',
            maxWidth: 1200,
            px: { xs: 1, sm: 2 },
          }}
        >
          <PEAClassic
            locationId={location.id}
            density="comfortable"
            defaultTab="overview"
            defaultArea="FOH"
          />
        </Box>
      </main>

      {/* Footer */}
      <footer className={sty.footer}>
        <Typography
          sx={{
            fontFamily,
            fontSize: 12,
            color: '#9ca3af',
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
