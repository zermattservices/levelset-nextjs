import * as React from 'react';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import sty from './DisciplineSettings.module.css';
import { InfractionsTab } from './InfractionsTab';
import { DisciplineActionsTab } from './DisciplineActionsTab';
import { DisciplineAccessTab } from './DisciplineAccessTab';
import { ComingSoonPlaceholder } from './ComingSoonPlaceholder';

const fontFamily = '"Satoshi", sans-serif';

const StyledTabs = styled(Tabs)(() => ({
  marginBottom: 24,
  '& .MuiTabs-indicator': {
    backgroundColor: '#31664a',
    height: 3,
  },
}));

const StyledTab = styled(Tab)(() => ({
  fontFamily,
  fontSize: 14,
  fontWeight: 500,
  textTransform: 'none',
  color: '#6b7280',
  '&.Mui-selected': {
    color: '#31664a',
    fontWeight: 600,
  },
}));

interface DisciplineSettingsProps {
  orgId: string | null;
  locationId: string | null;
  onNavigate?: (section: string) => void;
}

type TabValue = 'infractions' | 'actions' | 'access' | 'notifications';

export function DisciplineSettings({ orgId, locationId, onNavigate, disabled = false }: DisciplineSettingsProps) {
  const [activeTab, setActiveTab] = React.useState<TabValue>('infractions');

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'infractions':
        return <InfractionsTab orgId={orgId} disabled={disabled} />;
      case 'actions':
        return <DisciplineActionsTab orgId={orgId} disabled={disabled} />;
      case 'access':
        return <DisciplineAccessTab orgId={orgId} locationId={locationId} onNavigate={onNavigate} disabled={disabled} />;
      case 'notifications':
        return <ComingSoonPlaceholder title="Notifications" description="Configure automated discipline notifications coming soon." />;
      default:
        return null;
    }
  };

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <h2 className={sty.title}>Discipline</h2>
        <p className={sty.description}>
          Configure infractions, disciplinary actions, access controls, and notifications for your organization.
        </p>
      </div>

      <Box sx={{ width: '100%' }}>
        <StyledTabs value={activeTab} onChange={handleTabChange}>
          <StyledTab label="Infractions" value="infractions" />
          <StyledTab label="Actions" value="actions" />
          <StyledTab label="Access" value="access" />
          <StyledTab label="Notifications" value="notifications" />
        </StyledTabs>

        <div className={sty.tabContent}>
          {renderTabContent()}
        </div>
      </Box>
    </div>
  );
}

export default DisciplineSettings;
