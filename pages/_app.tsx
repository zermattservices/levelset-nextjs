import { PlasmicRootProvider } from "@plasmicapp/react-web";
import type { AppProps } from "next/app";
import Head from "next/head";
import { LicenseInfo } from '@mui/x-license';
import { LocationProvider } from "@/components/CodeComponents/LocationContext";
import "../styles/globals.css";
import "../styles/datagrid-pro.css";
import "../components/CodeComponents/scoreboard.css";
import "../components/CodeComponents/RosterTable.css";
import "../lib/logout"; // Initialize global logout function

// Initialize MUI X Pro license - must be called before rendering
const licenseKey = process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY;
if (licenseKey) {
  LicenseInfo.setLicenseKey(licenseKey);
  console.log('[MUI X License] License key initialized');
} else {
  console.warn('[MUI X License] No license key found in NEXT_PUBLIC_MUI_X_LICENSE_KEY');
}

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <PlasmicRootProvider Head={Head}>
      <LocationProvider>
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link rel="apple-touch-icon" href="/favicon.ico" />

          {/* Social Sharing Meta Tags */}
          <meta property="og:title" content="Levelset App" />
          <meta property="og:description" content="Employee management and discipline tracking system for restaurant operations." />
          <meta property="og:image" content="/levelset-social-cover.png" />
          <meta property="og:url" content="https://app.levelset.io" />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Levelset App" />

          {/* Twitter Card Meta Tags */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Levelset App" />
          <meta name="twitter:description" content="Employee management and discipline tracking system for restaurant operations." />
          <meta name="twitter:image" content="/levelset-social-cover.png" />

          {/* Additional Meta Tags */}
          <meta name="description" content="Employee management and discipline tracking system for restaurant operations." />
          <meta name="keywords" content="employee management, discipline tracking, restaurant operations, levelset" />
          <meta name="author" content="Levelset" />
        </Head>
        <Component {...pageProps} />
      </LocationProvider>
    </PlasmicRootProvider>
  );
}
