import * as React from 'react';
import {
  Switch,
  FormControl,
  Select,
  MenuItem,
  TextField,
  Tooltip,
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import sty from './ConnectedQuestionPicker.module.css';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface ConnectedQuestionPickerProps {
  connectedTo: string | undefined;
  connectorParams: Record<string, any> | undefined;
  onChange: (
    connectedTo: string | undefined,
    params: Record<string, any> | undefined
  ) => void;
}

const CONNECTORS = [
  { key: 'no_discipline_30d', label: 'No Discipline (30 days)', hasParams: false },
  { key: 'no_discipline_60d', label: 'No Discipline (60 days)', hasParams: false },
  { key: 'no_discipline_90d', label: 'No Discipline (90 days)', hasParams: false },
  { key: 'avg_rating_gte', label: 'Average Rating \u2265', hasParams: true, paramKey: 'threshold', paramLabel: 'Threshold' },
  { key: 'certified_status', label: 'Certified Status', hasParams: false },
  { key: 'no_unresolved_actions', label: 'No Unresolved Actions', hasParams: false },
] as const;

const selectSx = {
  fontFamily,
  fontSize: 12,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-muted-border)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-border)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
  '& .MuiSelect-select': { padding: '6px 10px', fontFamily, fontSize: 12 },
};

const paramFieldSx = {
  width: 72,
  '& .MuiInputBase-root': { fontFamily, fontSize: 12 },
  '& .MuiInputBase-input': { fontFamily, fontSize: 12, padding: '5px 8px', textAlign: 'center' as const },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-muted-border)' },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

export function ConnectedQuestionPicker({
  connectedTo,
  connectorParams,
  onChange,
}: ConnectedQuestionPickerProps) {
  const isEnabled = !!connectedTo;
  const activeConnector = CONNECTORS.find((c) => c.key === connectedTo);

  const handleToggle = (checked: boolean) => {
    if (checked) {
      onChange(CONNECTORS[0].key, undefined);
    } else {
      onChange(undefined, undefined);
    }
  };

  const handleConnectorChange = (key: string) => {
    const connector = CONNECTORS.find((c) => c.key === key);
    onChange(key, connector?.hasParams ? connectorParams || {} : undefined);
  };

  const handleParamChange = (paramKey: string, value: any) => {
    onChange(connectedTo, { ...(connectorParams || {}), [paramKey]: value });
  };

  if (!isEnabled) {
    return (
      <Tooltip title="Connect to Levelset data">
        <Switch
          size="small"
          checked={false}
          onChange={(e) => handleToggle(e.target.checked)}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: 'var(--ls-color-brand)',
            },
          }}
        />
      </Tooltip>
    );
  }

  return (
    <div className={sty.picker}>
      <Tooltip title="Levelset Connected">
        <Switch
          size="small"
          checked={true}
          onChange={(e) => handleToggle(e.target.checked)}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: 'var(--ls-color-brand)' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: 'var(--ls-color-brand)',
            },
          }}
        />
      </Tooltip>

      <span className={sty.connectedBadge}>
        <LinkIcon sx={{ fontSize: 12 }} />
        Connected
      </span>

      <FormControl size="small" className={sty.connectorSelect}>
        <Select
          value={connectedTo}
          onChange={(e) => handleConnectorChange(e.target.value)}
          sx={selectSx}
        >
          {CONNECTORS.map((c) => (
            <MenuItem key={c.key} value={c.key} sx={{ fontFamily, fontSize: 12 }}>
              {c.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {activeConnector?.hasParams && 'paramKey' in activeConnector && (
        <div className={sty.paramRow}>
          <span className={sty.paramLabel}>{activeConnector.paramLabel}:</span>
          <TextField
            type="number"
            value={connectorParams?.[activeConnector.paramKey] ?? ''}
            onChange={(e) =>
              handleParamChange(activeConnector.paramKey, Number(e.target.value) || 0)
            }
            size="small"
            sx={paramFieldSx}
          />
        </div>
      )}
    </div>
  );
}
