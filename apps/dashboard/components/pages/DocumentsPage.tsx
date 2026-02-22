import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Button } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';

import sty from './DocumentsPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';

import { DocumentsPageContent } from './documents/DocumentsPageContent';
import {
  ORG_DOCUMENT_CATEGORIES,
  ORG_CATEGORY_LABELS,
  ORG_CATEGORY_COLORS,
} from './documents/types';
import type { DocumentsConfig } from './documents/types';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

const fontFamily = '"Satoshi", sans-serif';

export function DocumentsPage() {
  const router = useRouter();
  const auth = useAuth();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push(`/auth/login?redirect=${encodeURIComponent(router.asPath)}`);
    }
  }, [auth.isLoaded, auth.authUser, router]);

  if (!auth.isLoaded || !auth.authUser) {
    return <AuthLoadingScreen />;
  }

  const isLevelsetAdmin = auth.role === 'Levelset Admin';

  const headerExtra = isLevelsetAdmin ? (
    <Button
      variant="outlined"
      startIcon={<PublicOutlinedIcon sx={{ fontSize: 18 }} />}
      onClick={() => router.push('/global-documents')}
      sx={{
        fontFamily,
        fontSize: 13,
        fontWeight: 600,
        textTransform: 'none',
        borderRadius: '8px',
        boxShadow: 'none',
        borderColor: 'var(--ls-color-muted-border)',
        color: 'var(--ls-color-text-primary)',
        '&:hover': {
          borderColor: 'var(--ls-color-brand)',
          backgroundColor: 'var(--ls-color-brand-soft)',
        },
      }}
    >
      Global Documents
    </Button>
  ) : null;

  const config: DocumentsConfig = {
    mode: 'org',
    apiBasePath: '/api/documents',
    pageTitle: 'Documents',
    headTitle: 'Levelset | Documents',
    rootBreadcrumbName: 'Documents',
    categories: ORG_DOCUMENT_CATEGORIES,
    categoryLabels: ORG_CATEGORY_LABELS,
    categoryColors: ORG_CATEGORY_COLORS,
    headerExtra,
  };

  return (
    <>
      <style>{`
        body {
          margin: 0;
        }
      `}</style>

      <div
        className={classNames(
          projectcss.all,
          projectcss.root_reset,
          projectcss.plasmic_default_styles,
          projectcss.plasmic_mixins,
          projectcss.plasmic_tokens,
          sty.root,
        )}
      >
        <MenuNavigation
          className={classNames('__wab_instance', sty.menuNavigation)}
          firstName={auth.first_name}
          userRole={auth.role}
        />

        <div className={sty.contentWrapper}>
          <div className={sty.contentInner}>
            {!isLevelsetAdmin ? (
              <>
                <Head>
                  <title key="title">Levelset | Documents</title>
                  <meta key="og:title" property="og:title" content="Levelset | Documents" />
                </Head>
                <div className={sty.comingSoonContainer}>
                  <DescriptionOutlinedIcon className={sty.comingSoonIcon} />
                  <h2 className={sty.comingSoonTitle}>Documents</h2>
                  <p className={sty.comingSoonDescription}>
                    Manage and organize documents for your organization. This feature is currently being developed.
                  </p>
                  <span className={sty.comingSoonBadge}>Coming Soon</span>
                </div>
              </>
            ) : (
              <DocumentsPageContent config={config} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
