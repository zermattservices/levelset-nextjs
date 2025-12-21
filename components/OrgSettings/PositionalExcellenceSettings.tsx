import * as React from 'react';
import { styled } from '@mui/material/styles';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import sty from './PositionalExcellenceSettings.module.css';
import { PositionsTab } from './PositionsTab';
import { RatingCriteriaTab } from './RatingCriteriaTab';
import { RoleMappingTab } from './RoleMappingTab';

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

interface PositionalExcellenceSettingsProps {
  orgId: string | null;
}

type TabValue = 'positions' | 'criteria' | 'role-mapping';

export function PositionalExcellenceSettings({ orgId }: PositionalExcellenceSettingsProps) {
  const [activeTab, setActiveTab] = React.useState<TabValue>('positions');
  const [positionsComplete, setPositionsComplete] = React.useState(false);
  const [criteriaComplete, setCriteriaComplete] = React.useState(false);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: TabValue) => {
    setActiveTab(newValue);
  };

  const handleNextFromPositions = () => {
    setActiveTab('criteria');
  };

  const handleNextFromCriteria = () => {
    setActiveTab('role-mapping');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'positions':
        return (
          <PositionsTab
            orgId={orgId}
            onComplete={(complete) => setPositionsComplete(complete)}
            onNext={handleNextFromPositions}
          />
        );
      case 'criteria':
        return (
          <RatingCriteriaTab
            orgId={orgId}
            onComplete={(complete) => setCriteriaComplete(complete)}
            onNext={handleNextFromCriteria}
          />
        );
      case 'role-mapping':
        return <RoleMappingTab orgId={orgId} />;
      default:
        return null;
    }
  };

  return (
    <div className={sty.container}>
      <div className={sty.header}>
        <h2 className={sty.title}>Positional Excellence</h2>
        <p className={sty.description}>
          Configure positions, rating criteria, and role permissions for positional ratings.
        </p>
      </div>

      <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <StyledTabs value={activeTab} onChange={handleTabChange} sx={{ flexShrink: 0 }}>
          <StyledTab label="Positions" value="positions" />
          <StyledTab 
            label="Rating Criteria" 
            value="criteria" 
            disabled={!positionsComplete}
          />
          <StyledTab 
            label="Role Mapping" 
            value="role-mapping" 
            disabled={!criteriaComplete}
          />
        </StyledTabs>

        <div className={sty.tabContent}>
          {renderTabContent()}
        </div>
      </Box>
    </div>
  );
}

export default PositionalExcellenceSettings;
