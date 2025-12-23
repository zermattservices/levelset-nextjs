import * as React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import sty from './OrgSettingsPage.module.css';
import projectcss from '@/components/plasmic/levelset_v2/plasmic_levelset_v2.module.css';
import { MenuNavigation } from '@/components/ui/MenuNavigation/MenuNavigation';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';
import { useAuth } from '@/lib/providers/AuthProvider';
import { OrgSettingsSidebar, type MenuItem } from '@/components/OrgSettings/OrgSettingsSidebar';
import { PositionalExcellenceSettings } from '@/components/OrgSettings/PositionalExcellenceSettings';
import { DisciplineSettings } from '@/components/OrgSettings/DisciplineSettings';
import { ComingSoonPlaceholder } from '@/components/OrgSettings/ComingSoonPlaceholder';
import { PlaceholderContent } from '@/components/OrgSettings/PlaceholderContent';
import { MobileAppAccess } from '@/components/OrgSettings/MobileAppAccess';
import { LocationDetails } from '@/components/OrgSettings/LocationDetails';
import { OrganizationDetails } from '@/components/OrgSettings/OrganizationDetails';
import { UsersTab } from '@/components/OrgSettings/UsersTab';
import { RolesTab } from '@/components/OrgSettings/RolesTab';
import { createSupabaseClient } from '@/util/supabase/component';

function classNames(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function OrgSettingsPage() {
  const router = useRouter();
  const auth = useAuth();
  const { selectedLocationId, selectedLocationOrgId, userHierarchyLevel } = useLocationContext();
  const [activeSection, setActiveSection] = React.useState<string>('positional-excellence');
  const [level1RoleName, setLevel1RoleName] = React.useState<string>('');
  
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Determine if user can edit settings
  // Only Level 0, Level 1, and Levelset Admin can edit
  const canEdit = React.useMemo(() => {
    if (auth.role === 'Levelset Admin') return true;
    if (userHierarchyLevel === null) return false;
    return userHierarchyLevel <= 1;
  }, [auth.role, userHierarchyLevel]);

  // Fetch level 1 role name for warning message
  React.useEffect(() => {
    async function fetchLevel1Role() {
      if (!selectedLocationOrgId) return;
      
      const { data } = await supabase
        .from('org_roles')
        .select('role_name')
        .eq('org_id', selectedLocationOrgId)
        .eq('hierarchy_level', 1)
        .single();
      
      if (data) {
        setLevel1RoleName(data.role_name);
      }
    }
    
    fetchLevel1Role();
  }, [selectedLocationOrgId, supabase]);

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (auth.isLoaded && !auth.authUser) {
      router.push('/auth/login');
    }
  }, [auth.isLoaded, auth.authUser, router]);

  const menuItems: MenuItem[] = [
    {
      group: 'Modules',
      items: [
        { id: 'positional-excellence', label: 'Positional Excellence', status: 'active' },
        { id: 'discipline', label: 'Discipline', status: 'active' },
        { id: 'pathway', label: 'Pathway', status: 'coming-soon' },
        { id: 'evaluations', label: 'Evaluations', status: 'coming-soon' },
      ],
    },
    {
      group: 'Users and Security',
      items: [
        { id: 'users', label: 'Users', status: 'active' },
        { id: 'roles', label: 'Roles', status: 'active' },
        { id: 'permissions', label: 'Permissions', status: 'coming-soon' },
      ],
    },
    {
      group: 'Mobile App',
      items: [
        { id: 'mobile-access', label: 'Access', status: 'active' },
        { id: 'mobile-config', label: 'Configuration', status: 'coming-soon' },
      ],
    },
    {
      group: 'General',
      items: [
        { id: 'location-details', label: 'Location Details', status: 'active' },
        { id: 'org-details', label: 'Organization Details', status: 'active' },
      ],
    },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'positional-excellence':
        return <PositionalExcellenceSettings orgId={selectedLocationOrgId} disabled={!canEdit} />;
      case 'discipline':
        return <DisciplineSettings orgId={selectedLocationOrgId} locationId={selectedLocationId} onNavigate={setActiveSection} disabled={!canEdit} />;
      case 'pathway':
        return <ComingSoonPlaceholder title="Pathway" description="Career pathway and development tracking coming soon." />;
      case 'evaluations':
        return <ComingSoonPlaceholder title="Evaluations" description="Performance evaluation scheduling and tracking coming soon." />;
      case 'users':
        return <UsersTab orgId={selectedLocationOrgId} disabled={!canEdit} />;
      case 'roles':
        return <RolesTab orgId={selectedLocationOrgId} disabled={!canEdit} />;
      case 'permissions':
        return <ComingSoonPlaceholder title="Permissions" description="Configure role-based permissions for your organization coming soon." />;
      case 'mobile-access':
        return <MobileAppAccess disabled={!canEdit} />;
      case 'mobile-config':
        return <ComingSoonPlaceholder title="Mobile App Configuration" description="Configure mobile app settings and features coming soon." />;
      case 'location-details':
        return <LocationDetails locationId={selectedLocationId} disabled={!canEdit} />;
      case 'org-details':
        return <OrganizationDetails orgId={selectedLocationOrgId} disabled={!canEdit} />;
      default:
        return <PositionalExcellenceSettings orgId={selectedLocationOrgId} disabled={!canEdit} />;
    }
  };

  // Show loading while checking auth
  if (!auth.isLoaded || (auth.authUser && userHierarchyLevel === null)) {
    return (
      <div className={sty.loadingContainer}>
        <div className={sty.loadingSpinner} />
      </div>
    );
  }

  return (
    <>
      <Head>
        <meta name="twitter:card" content="summary" />
        <title key="title">Levelset | Organization Settings</title>
        <meta key="og:title" property="og:title" content="Levelset | Organization Settings" />
        <meta key="twitter:title" name="twitter:title" content="Levelset | Organization Settings" />
      </Head>

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
          sty.root
        )}
      >
        <MenuNavigation
          className={classNames("__wab_instance", sty.menuNavigation)}
          firstName={auth.first_name}
          userRole={auth.role}
        />

        {/* Header section */}
        <div className={sty.headerSection}>
          <div className={sty.headerContent}>
            <div className={sty.headerTextContainer}>
              <h1 className={sty.pageTitle}>Organization Settings</h1>
              <p className={sty.pageSubtitle}>
                Configure settings and preferences for your organization.
              </p>
            </div>
            {!canEdit && (
              <div className={sty.readOnlyWarning}>
                Only the Operator and {level1RoleName || 'Level 1'}s are able to edit these settings.
              </div>
            )}
          </div>
        </div>

        {/* Main content with sidebar */}
        <div className={sty.mainSection}>
          <div className={sty.mainContent}>
            <OrgSettingsSidebar
              menuItems={menuItems}
              activeSection={activeSection}
              onSectionChange={setActiveSection}
            />
            <div className={sty.contentArea}>
              {renderContent()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default OrgSettingsPage;
