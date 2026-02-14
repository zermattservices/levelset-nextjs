/**
 * OrganizationModal
 * Modal for viewing and managing organization details
 */

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Tabs,
  Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { createSupabaseClient } from '@/util/supabase/component';
import { OrgOverviewTab } from './OrgOverviewTab';
import { OrgFeaturesTab } from './OrgFeaturesTab';
import styles from './OrganizationModal.module.css';

interface Location {
  id: string;
  location_number: string;
  org_id: string;
}

interface Organization {
  id: string;
  name: string;
  created_at: string;
  start_date: string | null;
  subscription_plan: string | null;
  locations: Location[];
  employee_count: number;
  state: string | null;
  operator_name: string | null;
}

interface OrganizationModalProps {
  open: boolean;
  organization: Organization | null;
  onClose: () => void;
}

type TabValue = 'overview' | 'subscription' | 'features';

export function OrganizationModal({ open, organization, onClose }: OrganizationModalProps) {
  const [activeTab, setActiveTab] = React.useState<TabValue>('overview');
  const [locationNames, setLocationNames] = React.useState<Map<string, string>>(new Map());

  const supabase = React.useMemo(() => createSupabaseClient(), []);

  // Fetch location names from CFA data
  React.useEffect(() => {
    async function fetchLocationNames() {
      if (!organization?.locations.length) return;

      const locationNums = organization.locations.map(l => l.location_number);
      
      const { data, error } = await supabase
        .from('cfa_locations')
        .select('location_num, location_name')
        .in('location_num', locationNums);

      if (!error && data) {
        const nameMap = new Map<string, string>();
        for (const loc of data) {
          nameMap.set(loc.location_num, loc.location_name);
        }
        setLocationNames(nameMap);
      }
    }

    if (open && organization) {
      fetchLocationNames();
    }
  }, [open, organization, supabase]);

  // Reset tab when modal opens
  React.useEffect(() => {
    if (open) {
      setActiveTab('overview');
    }
  }, [open]);

  if (!organization) return null;

  // Get location display names
  const getLocationDisplayNames = (): string[] => {
    return organization.locations.map(loc => {
      const cfaName = locationNames.get(loc.location_number);
      if (cfaName) {
        // Extract short name (e.g., "Buda FSU" from "CFA Buda FSU")
        return cfaName.replace(/^CFA\s+/, '');
      }
      return `Location ${loc.location_number}`;
    });
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          padding: '20px 24px 16px',
          borderBottom: '1px solid #e5e5e5',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              sx={{
                fontFamily: '"Mont", sans-serif',
                fontSize: '24px',
                fontWeight: 600,
                color: '#0d1b14',
              }}
            >
              {organization.operator_name || organization.name}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Satoshi", sans-serif',
                fontSize: '14px',
                color: '#666',
                marginTop: '4px',
              }}
            >
              {getLocationDisplayNames().join(', ')}
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ marginTop: '-8px', marginRight: '-8px' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            marginTop: '16px',
            minHeight: 'unset',
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--ls-color-brand)',
            },
            '& .MuiTab-root': {
              fontFamily: '"Satoshi", sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: '40px',
              padding: '8px 16px',
              color: '#666',
              '&.Mui-selected': {
                color: 'var(--ls-color-brand)',
                fontWeight: 600,
              },
            },
          }}
        >
          <Tab label="Overview" value="overview" />
          <Tab label="Subscription" value="subscription" />
          <Tab label="Features" value="features" />
        </Tabs>
      </DialogTitle>

      {/* Content */}
      <Box
        sx={{
          padding: '24px',
          overflowY: 'auto',
          minHeight: '400px',
        }}
      >
        {activeTab === 'overview' && (
          <OrgOverviewTab organization={organization} locationNames={locationNames} />
        )}
        {activeTab === 'subscription' && (
          <div className={styles.placeholder}>
            <div className={styles.placeholderContent}>
              <Typography
                sx={{
                  fontFamily: '"Satoshi", sans-serif',
                  fontSize: '16px',
                  fontWeight: 500,
                  color: '#666',
                  marginBottom: '8px',
                }}
              >
                Subscription Management
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Satoshi", sans-serif',
                  fontSize: '14px',
                  color: '#999',
                }}
              >
                Coming soon. This will connect to Stripe for billing management.
              </Typography>
            </div>
          </div>
        )}
        {activeTab === 'features' && (
          <OrgFeaturesTab orgId={organization.id} />
        )}
      </Box>
    </Dialog>
  );
}

export default OrganizationModal;


