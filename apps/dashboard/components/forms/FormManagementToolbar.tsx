import * as React from 'react';
import {
  TextField,
  Button,
  Chip,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import sty from './FormManagementToolbar.module.css';
import type { FormType } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FormManagementToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeTypeFilter: FormType | null;
  onTypeFilterChange: (type: FormType | null) => void;
  onCreateForm: () => void;
  onCreateGroup: () => void;
}

const TYPE_FILTERS: { value: FormType; label: string }[] = [
  { value: 'rating', label: 'Rating' },
  { value: 'discipline', label: 'Discipline' },
  { value: 'evaluation', label: 'Evaluation' },
  { value: 'custom', label: 'Custom' },
];

export function FormManagementToolbar({
  searchQuery,
  onSearchChange,
  activeTypeFilter,
  onTypeFilterChange,
  onCreateForm,
  onCreateGroup,
}: FormManagementToolbarProps) {
  return (
    <div className={sty.toolbar}>
      <div className={sty.searchRow}>
        <TextField
          size="small"
          placeholder="Search forms..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            maxWidth: 360,
            '& .MuiInputBase-root': {
              fontFamily,
              fontSize: 14,
              borderRadius: '8px',
            },
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--ls-color-muted-border)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--ls-color-border)',
            },
            '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: 'var(--ls-color-brand)',
              borderWidth: '2px',
            },
          }}
        />
        <div className={sty.actions}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<CreateNewFolderOutlinedIcon sx={{ fontSize: 16 }} />}
            onClick={onCreateGroup}
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              borderColor: 'var(--ls-color-muted-border)',
              color: 'var(--ls-color-text-primary)',
              borderRadius: '8px',
              padding: '6px 14px',
              '&:hover': {
                borderColor: 'var(--ls-color-border)',
                backgroundColor: 'var(--ls-color-neutral-foreground)',
              },
            }}
          >
            Create Group
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            onClick={onCreateForm}
            sx={{
              fontFamily,
              fontSize: 13,
              fontWeight: 600,
              textTransform: 'none',
              backgroundColor: 'var(--ls-color-brand)',
              borderRadius: '8px',
              padding: '6px 14px',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: 'var(--ls-color-brand-hover)',
                boxShadow: 'none',
              },
            }}
          >
            Create Form
          </Button>
        </div>
      </div>
      <div className={sty.filterRow}>
        <Chip
          label="All"
          size="small"
          variant={activeTypeFilter === null ? 'filled' : 'outlined'}
          onClick={() => onTypeFilterChange(null)}
          sx={{
            fontFamily,
            fontSize: 12,
            fontWeight: activeTypeFilter === null ? 600 : 400,
            borderRadius: '16px',
            backgroundColor: activeTypeFilter === null ? 'var(--ls-color-brand-soft)' : 'transparent',
            color: activeTypeFilter === null ? 'var(--ls-color-brand)' : 'var(--ls-color-muted)',
            borderColor: activeTypeFilter === null ? 'transparent' : 'var(--ls-color-muted-border)',
            '&:hover': {
              backgroundColor: activeTypeFilter === null ? 'var(--ls-color-brand-soft)' : 'var(--ls-color-neutral-foreground)',
            },
          }}
        />
        {TYPE_FILTERS.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            size="small"
            variant={activeTypeFilter === filter.value ? 'filled' : 'outlined'}
            onClick={() => onTypeFilterChange(activeTypeFilter === filter.value ? null : filter.value)}
            sx={{
              fontFamily,
              fontSize: 12,
              fontWeight: activeTypeFilter === filter.value ? 600 : 400,
              borderRadius: '16px',
              backgroundColor: activeTypeFilter === filter.value ? 'var(--ls-color-brand-soft)' : 'transparent',
              color: activeTypeFilter === filter.value ? 'var(--ls-color-brand)' : 'var(--ls-color-muted)',
              borderColor: activeTypeFilter === filter.value ? 'transparent' : 'var(--ls-color-muted-border)',
              '&:hover': {
                backgroundColor: activeTypeFilter === filter.value ? 'var(--ls-color-brand-soft)' : 'var(--ls-color-neutral-foreground)',
              },
            }}
          />
        ))}
      </div>
    </div>
  );
}
