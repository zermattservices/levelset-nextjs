import type { AppProps } from "next/app";
import Head from "next/head";
import { useRouter } from "next/router";
import { LicenseInfo } from '@mui/x-license';
import { AuthProvider } from '@/lib/providers/AuthProvider';
import "@levelset/design-tokens/css/variables.css";
import "@levelset/design-tokens/css/plasmic-compat.css";
import "../styles/globals.css";
import "../styles/datagrid-pro.css";
import "../components/CodeComponents/scoreboard.css";
import "../components/CodeComponents/RosterTable.css";
import "../lib/logout"; // Initialize global logout function
import "../lib/i18n"; // Initialize i18next

// Initialize MUI X Pro license - must be called before rendering
const licenseKey = process.env.NEXT_PUBLIC_MUI_X_LICENSE_KEY;
if (licenseKey) {
  LicenseInfo.setLicenseKey(licenseKey);
  console.log('[MUI X License] License key initialized');
} else {
  console.warn('[MUI X License] No license key found in NEXT_PUBLIC_MUI_X_LICENSE_KEY');
}

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // Wrap roadmap pages in AuthProvider at _app level
  // so useAuth() works correctly in page components
  const isRoadmapPage = router.pathname.startsWith('/roadmap');
  
  const content = (
    <>
      <Head>
        {/* Force light mode */}
        <meta name="color-scheme" content="light only" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/favicon.ico" />

        {/* Social Sharing Meta Tags */}
        <meta key="og:title" property="og:title" content="Levelset App" />
        <meta key="og:description" property="og:description" content="Employee management and discipline tracking system for restaurant operations." />
        <meta key="og:image" property="og:image" content="/levelset-social-cover.png" />
        <meta key="og:url" property="og:url" content="https://app.levelset.io" />
        <meta key="og:type" property="og:type" content="website" />
        <meta key="og:site_name" property="og:site_name" content="Levelset App" />

        {/* Twitter Card Meta Tags */}
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <meta key="twitter:title" name="twitter:title" content="Levelset App" />
        <meta key="twitter:description" name="twitter:description" content="Employee management and discipline tracking system for restaurant operations." />
        <meta key="twitter:image" name="twitter:image" content="/levelset-social-cover.png" />

        {/* Additional Meta Tags */}
        <meta key="description" name="description" content="Employee management and discipline tracking system for restaurant operations." />
        <meta name="keywords" content="employee management, discipline tracking, restaurant operations, levelset" />
        <meta name="author" content="Levelset" />
      </Head>
      <Component {...pageProps} />
    </>
  );
  
  // Wrap roadmap pages in AuthProvider so useAuth works at page level
  if (isRoadmapPage) {
    return <AuthProvider>{content}</AuthProvider>;
  }
  
  return content;
}
