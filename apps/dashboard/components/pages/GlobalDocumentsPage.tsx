import * as React from 'react';
import { useRouter } from 'next/router';

import sty from './DocumentsPage.module.css';
import projectcss from '@/styles/base.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { AuthLoadingScreen } from '@/components/CodeComponents/AuthLoadingScreen';
import { useAuth } from '@/lib/providers/AuthProvider';

import { DocumentsPageContent } from './documents/DocumentsPageContent';
import {
  GLOBAL_DOCUMENT_CATEGORIES,
  GLOBAL_CATEGORY_LABELS,
  GLOBAL_CATEGORY_COLORS,
} from './documents/types';
import type { DocumentsConfig } from './documents/types';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function GlobalDocumentsPage() {
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

  // Only Levelset Admins can access global documents
  if (auth.role !== 'Levelset Admin') {
    router.push('/documents');
    return <AuthLoadingScreen />;
  }

  const config: DocumentsConfig = {
    mode: 'global',
    apiBasePath: '/api/global-documents',
    pageTitle: 'Global Documents',
    headTitle: 'Levelset | Global Documents',
    rootBreadcrumbName: 'Global Documents',
    categories: GLOBAL_DOCUMENT_CATEGORIES,
    categoryLabels: GLOBAL_CATEGORY_LABELS,
    categoryColors: GLOBAL_CATEGORY_COLORS,
    backLink: { label: 'Back to Documents', href: '/documents' },
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
            <DocumentsPageContent config={config} />
          </div>
        </div>
      </div>
    </>
  );
}
