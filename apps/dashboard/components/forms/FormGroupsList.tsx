import * as React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RocketLaunchOutlinedIcon from '@mui/icons-material/RocketLaunchOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import sty from './FormGroupsList.module.css';
import { FormTemplateCard } from './FormTemplateCard';
import type { FormGroup, FormTemplate } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FormGroupsListProps {
  groups: FormGroup[];
  templates: FormTemplate[];
  searchQuery: string;
  typeFilter: string | null;
  onDuplicateTemplate?: (template: FormTemplate) => void;
  onArchiveTemplate?: (template: FormTemplate) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  RocketLaunchOutlined: <RocketLaunchOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-brand)' }} />,
  GavelOutlined: <GavelOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-warning)' }} />,
  EventNoteOutlined: <EventNoteOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-success)' }} />,
};

function getGroupIcon(icon: string | null): React.ReactNode {
  if (icon && ICON_MAP[icon]) {
    return ICON_MAP[icon];
  }
  return <FolderOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />;
}

export function FormGroupsList({
  groups,
  templates,
  searchQuery,
  typeFilter,
  onDuplicateTemplate,
  onArchiveTemplate,
}: FormGroupsListProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => {
    return new Set(groups.map((g) => g.id));
  });

  // Expand all groups whenever groups list changes
  React.useEffect(() => {
    setExpandedGroups(new Set(groups.map((g) => g.id)));
  }, [groups]);

  const handleToggle = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates.filter((t) => {
      if (typeFilter && t.form_type !== typeFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [templates, typeFilter, searchQuery]);

  // Group templates by group_id
  const templatesByGroup = React.useMemo(() => {
    const map: Record<string, FormTemplate[]> = {};
    for (const t of filteredTemplates) {
      if (!map[t.group_id]) {
        map[t.group_id] = [];
      }
      map[t.group_id].push(t);
    }
    return map;
  }, [filteredTemplates]);

  // Filter groups to only show those with matching templates (or all if no search/filter)
  const visibleGroups = React.useMemo(() => {
    if (!searchQuery && !typeFilter) return groups;
    return groups.filter((g) => (templatesByGroup[g.id]?.length || 0) > 0);
  }, [groups, searchQuery, typeFilter, templatesByGroup]);

  if (visibleGroups.length === 0 && (searchQuery || typeFilter)) {
    return (
      <div className={sty.noResults}>
        <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
        <span className={sty.noResultsText}>No forms match your search</span>
      </div>
    );
  }

  return (
    <div className={sty.list}>
      {visibleGroups.map((group) => {
        const groupTemplates = templatesByGroup[group.id] || [];
        const isExpanded = expandedGroups.has(group.id);

        return (
          <Accordion
            key={group.id}
            expanded={isExpanded}
            onChange={() => handleToggle(group.id)}
            disableGutters
            elevation={0}
            sx={{
              border: '1px solid var(--ls-color-muted-border)',
              borderRadius: '10px !important',
              '&:before': { display: 'none' },
              '&.Mui-expanded': { margin: 0 },
              overflow: 'hidden',
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMoreIcon sx={{ color: 'var(--ls-color-muted)' }} />}
              sx={{
                padding: '4px 16px',
                minHeight: 52,
                '& .MuiAccordionSummary-content': {
                  margin: '8px 0',
                  alignItems: 'center',
                  gap: '10px',
                },
              }}
            >
              <div className={sty.groupIconWrapper}>
                {getGroupIcon(group.icon)}
              </div>
              <div className={sty.groupInfo}>
                <span className={sty.groupName}>{group.name}</span>
                {group.description && (
                  <span className={sty.groupDescription}>{group.description}</span>
                )}
              </div>
              <div className={sty.groupBadges}>
                <Chip
                  label={`${groupTemplates.length} form${groupTemplates.length !== 1 ? 's' : ''}`}
                  size="small"
                  sx={{
                    fontFamily,
                    fontSize: 11,
                    fontWeight: 500,
                    height: 22,
                    borderRadius: '12px',
                    backgroundColor: 'var(--ls-color-neutral-foreground)',
                    color: 'var(--ls-color-muted)',
                  }}
                />
                {group.is_system && (
                  <Chip
                    label="System"
                    size="small"
                    variant="outlined"
                    sx={{
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 500,
                      height: 22,
                      borderRadius: '12px',
                      borderColor: 'var(--ls-color-muted-border)',
                      color: 'var(--ls-color-muted)',
                    }}
                  />
                )}
              </div>
            </AccordionSummary>
            <AccordionDetails
              sx={{
                padding: '0 16px 16px',
              }}
            >
              {groupTemplates.length === 0 ? (
                <div className={sty.emptyGroup}>
                  <span className={sty.emptyGroupText}>
                    No forms in this group yet
                  </span>
                </div>
              ) : (
                <div className={sty.templateGrid}>
                  {groupTemplates.map((template) => (
                    <FormTemplateCard
                      key={template.id}
                      template={template}
                      onDuplicate={onDuplicateTemplate}
                      onArchive={onArchiveTemplate}
                    />
                  ))}
                </div>
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}
    </div>
  );
}
