/**
 * Permissions Settings
 * Main container for permission configuration with two tabs:
 * - Permission Levels: View and manage permission profiles
 * - Modify Access: Configure granular permissions for each profile
 */

import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import { styled } from '@mui/material/styles';
import BusinessIcon from '@mui/icons-material/Business';
import sty from './PermissionsSettings.module.css';
import { PermissionLevelsTab } from './PermissionLevelsTab';
import { ModifyAccessTab } from './ModifyAccessTab';
import { usePermissions } from '@/lib/providers/PermissionsProvider';
import { P } from '@/lib/permissions/constants';
import { createSupabaseClient } from '@/util/supabase/component';
import { useAuth } from '@/lib/providers/AuthProvider';

const fontFamily = '"Satoshi", sans-serif';

const OrgLevelTag = styled(Chip)(() => ({
  fontFamily,
  fontSize: 11,
  fontWeight: 500,
  height: 22,
  backgroundColor: '#f0fdf4',
  color: '#166534',
  border: '1px solid #bbf7d0',
  '& .MuiChip-icon': {
    fontSize: 14,
    color: '#166534',
  },
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`permissions-tabpanel-${index}`}
      aria-labelledby={`permissions-tab-${index}`}
      className={sty.tabPanel}
      {...other}
    >
      {value === index && children}
    </div>
  );
}

interface PermissionsSettingsProps {
  orgId: string | null;
  disabled?: boolean;
  activeSubTab?: string;
  onSubTabChange?: (subtab: string | undefined) => void;
}

type TabValue = 'levels' | 'access';
const VALID_TABS: TabValue[] = ['levels', 'access'];

export function PermissionsSettings({ orgId, disabled = false, activeSubTab, onSubTabChange }: PermissionsSettingsProps) {
  const [selectedProfileId, setSelectedProfileId] = React.useState<string | null>(null);
  const [locationCount, setLocationCount] = React.useState<number>(0);
  const { has, canEditLevel, hierarchyLevel, loading: permissionsLoading } = usePermissions();
  const auth = useAuth();
  const supabase = React.useMemo(() => createSupabaseClient(), []);
  
  // Derive active tab from URL subtab prop
  const activeTabValue: TabValue = React.useMemo(() => {
    if (activeSubTab && VALID_TABS.includes(activeSubTab as TabValue)) {
      return activeSubTab as TabValue;
    }
    return 'levels';
  }, [activeSubTab]);
  
  // Convert to numeric index for MUI Tabs
  const activeTab = activeTabValue === 'levels' ? 0 : 1;

  // Check permissions - Levelset Admin always has access
  const isLevelsetAdmin = auth.role === 'Levelset Admin';
  const canViewPermissions = isLevelsetAdmin || has(P.PERMS_VIEW);
  const canManagePermissions = isLevelsetAdmin || has(P.PERMS_MANAGE);

  // Fetch location count for the organization
  React.useEffect(() => {
    async function fetchLocationCount() {
      if (!orgId) return;
      
      const { count } = await supabase
        .from('locations')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);
      
      setLocationCount(count || 0);
    }
    
    fetchLocationCount();
  }, [orgId, supabase]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    if (onSubTabChange) {
      onSubTabChange(newValue === 0 ? 'levels' : 'access');
    }
  };

  // When a profile is selected in the levels tab, switch to modify access tab
  const handleEditProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    if (onSubTabChange) {
      onSubTabChange('access');
    }
  };

  if (permissionsLoading) {
    return (
      <div className={sty.loadingContainer}>
        <div className={sty.loadingSpinner} />
      </div>
    );
  }

  if (!canViewPermissions) {
    return (
      <div className={sty.container}>
        <div className={sty.noAccessMessage}>
          You do not have permission to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 className={sty.title}>Permissions</h2>
          {locationCount > 1 && (
            <OrgLevelTag
              icon={<BusinessIcon />}
              label="Applies to all locations"
              size="small"
            />
          )}
        </div>
        <p className={sty.description}>
          Configure permission levels and access controls for your organization.
        </p>
      </div>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="permissions settings tabs"
          sx={{
            '& .MuiTab-root': {
              fontFamily,
              fontSize: 14,
              fontWeight: 500,
              textTransform: 'none',
              color: '#6b7280',
              '&.Mui-selected': {
                color: '#31664a',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#31664a',
            },
          }}
        >
          <Tab label="Permission Levels" />
          <Tab label="Modify Access" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <PermissionLevelsTab
          orgId={orgId}
          disabled={disabled || !canManagePermissions}
          userHierarchyLevel={isLevelsetAdmin ? -1 : hierarchyLevel}
          canEditLevel={isLevelsetAdmin ? () => true : canEditLevel}
          onEditProfile={handleEditProfile}
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <ModifyAccessTab
          orgId={orgId}
          disabled={disabled || !canManagePermissions}
          userHierarchyLevel={isLevelsetAdmin ? -1 : hierarchyLevel}
          canEditLevel={isLevelsetAdmin ? () => true : canEditLevel}
          initialProfileId={selectedProfileId}
        />
      </TabPanel>
    </div>
  );
}

export default PermissionsSettings;
