import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MenuNavigation from '@/components/ui/MenuNavigation/MenuNavigation';
import AppProviders from '@/lib/providers/AppProviders';
import { useAuth } from '@/lib/providers/AuthProvider';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import RoadmapSubHeader from './RoadmapSubHeader';
import styles from './Roadmap.module.css';

interface RoadmapLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  subHeaderMode?: 'list' | 'detail' | 'board';
  activeTab?: 'features' | 'roadmap';
}

function RoadmapLayoutContent({ 
  children, 
  subHeaderMode = 'list',
  activeTab = 'features',
}: Omit<RoadmapLayoutProps, 'title' | 'description'>) {
  const router = useRouter();
  const auth = useAuth();

  // Redirect unauthenticated users to login on app subdomain
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      const currentPath = router.asPath || router.pathname;
      const redirectUrl = `https://app.levelset.io/auth/login?redirect=${encodeURIComponent(`https://roadmap.levelset.io${currentPath}`)}`;
      window.location.href = redirectUrl;
    }
  }, [auth.isLoaded, auth.authUser, router]);

  // Show loading screen while auth is loading or redirecting
  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className={styles.pageWrapper}>
      <MenuNavigation />
      <RoadmapSubHeader mode={subHeaderMode} activeTab={activeTab} />
      {children}
    </div>
  );
}

export default function RoadmapLayout({ 
  children, 
  title = 'Levelset Roadmap',
  description = 'Share your ideas, vote on features, and help shape the future of Levelset',
  subHeaderMode = 'list',
  activeTab = 'features',
}: RoadmapLayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        
        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://roadmap.levelset.io" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>
      <AppProviders>
        <RoadmapLayoutContent subHeaderMode={subHeaderMode} activeTab={activeTab}>
          {children}
        </RoadmapLayoutContent>
      </AppProviders>
    </>
  );
}
