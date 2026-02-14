import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import MenuNavigation from '@/components/ui/MenuNavigation/MenuNavigation';
import { useAuth } from '@/lib/providers/AuthProvider';
import { PermissionsProvider } from '@/lib/providers/PermissionsProvider';
import { ImpersonationProvider } from '@/lib/providers/ImpersonationProvider';
import { LocationProvider } from '@/components/CodeComponents/LocationContext';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { LocationSelectModal } from '@/components/CodeComponents/LocationSelectModal';
import { ImpersonationBanner } from '@/components/ImpersonationBanner/ImpersonationBanner';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import RoadmapSubHeader from './RoadmapSubHeader';
import styles from './Roadmap.module.css';

// Import Plasmic CSS for design tokens
import projectcss from '@/styles/base.module.css';

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
  const { selectLocation, selectedLocationId } = useLocationContext();
  const [isSettingSession, setIsSettingSession] = React.useState(false);
  
  // Handle location parameter from URL (passed from app.levelset.io)
  React.useEffect(() => {
    const locationParam = router.query.location;
    if (locationParam && typeof locationParam === 'string' && locationParam !== selectedLocationId) {
      selectLocation(locationParam);
      // Clean URL after setting location
      const { location, ...restQuery } = router.query;
      if (Object.keys(restQuery).length === 0) {
        router.replace(router.pathname, undefined, { shallow: true });
      } else {
        router.replace({ pathname: router.pathname, query: restQuery }, undefined, { shallow: true });
      }
    }
  }, [router.query.location, selectedLocationId, selectLocation, router]);

  // Handle token from cross-domain auth redirect
  React.useEffect(() => {
    const handleTokenAuth = async () => {
      const { token, refresh_token } = router.query;
      
      if (token && typeof token === 'string' && !auth.authUser) {
        setIsSettingSession(true);
        try {
          const supabase = (await import('@/util/supabase/component')).createSupabaseClient();
          
          // Set the session using the tokens from the redirect
          const { data, error } = await supabase.auth.setSession({
            access_token: token,
            refresh_token: refresh_token as string || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            // If setting session fails, redirect to login
            const currentPath = router.asPath?.split('?')[0] || router.pathname;
            const redirectUrl = `https://app.levelset.io/auth/login?redirect=${encodeURIComponent(`https://roadmap.levelset.io${currentPath}`)}`;
            window.location.href = redirectUrl;
            return;
          }

          // Remove token from URL after successful session setup
          const cleanPath = router.asPath?.split('?')[0] || router.pathname;
          router.replace(cleanPath, undefined, { shallow: true });
        } catch (error) {
          console.error('Error handling token auth:', error);
        } finally {
          setIsSettingSession(false);
        }
      }
    };

    handleTokenAuth();
  }, [router.query, auth.authUser, router]);

  // With shared cookies, we should be able to read the session directly
  // Only redirect if we're truly not authenticated after checking cookies
  React.useEffect(() => {
    // Give auth provider time to check shared cookies
    const timeout = setTimeout(() => {
      if (auth.isLoaded && !auth.authUser && !isSettingSession && !router.query.token) {
        const currentPath = router.asPath?.split('?')[0] || router.pathname;
        // Redirect to login on app subdomain
        const redirectUrl = `https://app.levelset.io/auth/login?redirect=${encodeURIComponent(`https://roadmap.levelset.io${currentPath}`)}`;
        window.location.href = redirectUrl;
      }
    }, 500); // Small delay to allow cookie check

    return () => clearTimeout(timeout);
  }, [auth.isLoaded, auth.authUser, router, isSettingSession]);

  // Show loading screen while auth is loading, setting session, or redirecting
  if (!auth.isLoaded || (!auth.authUser && !isSettingSession && !router.query.token)) {
    return <AuthLoadingScreen />;
  }

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.stickyNav}>
        <MenuNavigation />
      </div>
      <RoadmapSubHeader mode={subHeaderMode} activeTab={activeTab} />
      <div className={styles.mainContent}>
        {children}
      </div>
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
      {/* AuthProvider is in _app.tsx for roadmap pages, so we just add the other providers here */}
      <div className={projectcss.plasmic_tokens}>
        <ImpersonationProvider>
          <LocationProvider>
            <PermissionsProvider>
              <ImpersonationBanner />
              <RoadmapLayoutContent subHeaderMode={subHeaderMode} activeTab={activeTab}>
                {children}
              </RoadmapLayoutContent>
              <LocationSelectModal />
            </PermissionsProvider>
          </LocationProvider>
        </ImpersonationProvider>
      </div>
    </>
  );
}
