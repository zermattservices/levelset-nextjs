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

const LOCKED_SLUGS = ['positional_excellence', 'discipline'];

export function FormGroupsList({
  groups,
  templates,
  searchQuery,
  typeFilter,
  onDuplicateTemplate,
  onArchiveTemplate,
}: FormGroupsListProps) {
  // Separate locked system groups (PE + Discipline) from display groups
  const lockedGroups = React.useMemo(() => groups.filter((g) => LOCKED_SLUGS.includes(g.slug)), [groups]);
  const displayGroups = React.useMemo(() => groups.filter((g) => !LOCKED_SLUGS.includes(g.slug)), [groups]);

  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(() => {
    const ids = new Set(groups.map((g) => g.id));
    ids.add('__system__');
    return ids;
  });

  // Expand all groups whenever groups list changes
  React.useEffect(() => {
    const ids = new Set(groups.map((g) => g.id));
    ids.add('__system__');
    setExpandedGroups(ids);
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

  // Collect templates for the merged "System" group
  const systemTemplates = React.useMemo(() => {
    const lockedIds = new Set(lockedGroups.map((g) => g.id));
    return filteredTemplates.filter((t) => lockedIds.has(t.group_id));
  }, [filteredTemplates, lockedGroups]);

  // Filter display groups to only show those with matching templates (or all if no search/filter)
  const visibleGroups = React.useMemo(() => {
    if (!searchQuery && !typeFilter) return displayGroups;
    return displayGroups.filter((g) => (templatesByGroup[g.id]?.length || 0) > 0);
  }, [displayGroups, searchQuery, typeFilter, templatesByGroup]);

  const showSystemGroup = !searchQuery && !typeFilter
    ? lockedGroups.length > 0
    : systemTemplates.length > 0;

  if (visibleGroups.length === 0 && !showSystemGroup && (searchQuery || typeFilter)) {
    return (
      <div className={sty.noResults}>
        <DescriptionOutlinedIcon sx={{ fontSize: 40, color: 'var(--ls-color-muted)', opacity: 0.5 }} />
        <span className={sty.noResultsText}>No forms match your search</span>
      </div>
    );
  }

  const renderGroupAccordion = (
    groupId: string,
    icon: React.ReactNode,
    name: string,
    description: string | null,
    groupTemplates: FormTemplate[],
    isSystem: boolean,
  ) => {
    const isExpanded = expandedGroups.has(groupId);
    return (
      <Accordion
        key={groupId}
        expanded={isExpanded}
        onChange={() => handleToggle(groupId)}
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
            {icon}
          </div>
          <div className={sty.groupInfo}>
            <span className={sty.groupName}>{name}</span>
            {description && (
              <span className={sty.groupDescription}>{description}</span>
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
            {isSystem && (
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
        <AccordionDetails sx={{ padding: '0 16px 16px' }}>
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
  };

  return (
    <div className={sty.list}>
      {/* Merged System group (PE + Discipline) — view only */}
      {showSystemGroup && renderGroupAccordion(
        '__system__',
        <RocketLaunchOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-brand)' }} />,
        'System',
        'Positional Excellence & Discipline forms managed by Levelset',
        systemTemplates,
        true,
      )}

      {/* Editable groups (Evaluations + custom) */}
      {visibleGroups.map((group) => {
        const groupTemplates = templatesByGroup[group.id] || [];
        return renderGroupAccordion(
          group.id,
          getGroupIcon(group.icon),
          group.name,
          group.description,
          groupTemplates,
          group.is_system,
        );
      })}
    </div>
  );
}
