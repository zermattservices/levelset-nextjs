import * as React from 'react';
import { useRouter } from 'next/router';
import {
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import sty from './FormTemplateCard.module.css';
import type { FormTemplate, FormType } from '@/lib/forms/types';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface FormTemplateCardProps {
  template: FormTemplate;
  onDuplicate?: (template: FormTemplate) => void;
  onArchive?: (template: FormTemplate) => void;
}

const TYPE_COLORS: Record<FormType, { bg: string; text: string }> = {
  rating: { bg: 'var(--ls-color-brand-soft)', text: 'var(--ls-color-brand)' },
  discipline: { bg: 'var(--ls-color-warning-soft)', text: 'var(--ls-color-warning)' },
  evaluation: { bg: 'var(--ls-color-success-soft)', text: 'var(--ls-color-success)' },
  custom: { bg: 'var(--ls-color-neutral-foreground)', text: 'var(--ls-color-muted)' },
};

const TYPE_LABELS: Record<FormType, string> = {
  rating: 'Rating',
  discipline: 'Discipline',
  evaluation: 'Evaluation',
  custom: 'Custom',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function FormTemplateCard({
  template,
  onDuplicate,
  onArchive,
}: FormTemplateCardProps) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);

  const typeColor = TYPE_COLORS[template.form_type] || TYPE_COLORS.custom;
  const typeLabel = TYPE_LABELS[template.form_type] || 'Custom';

  const handleClick = () => {
    router.push(`/form-management/${template.id}`);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    router.push(`/form-management/${template.id}`);
  };

  const handleDuplicate = () => {
    handleMenuClose();
    onDuplicate?.(template);
  };

  const handleArchive = () => {
    handleMenuClose();
    onArchive?.(template);
  };

  return (
    <div className={sty.card} onClick={handleClick} role="button" tabIndex={0}>
      <div className={sty.cardHeader}>
        <div className={sty.cardIcon}>
          <DescriptionOutlinedIcon sx={{ fontSize: 20, color: 'var(--ls-color-muted)' }} />
        </div>
        <div className={sty.cardInfo}>
          <span className={sty.cardName}>{template.name}</span>
          {template.description && (
            <span className={sty.cardDescription}>{template.description}</span>
          )}
        </div>
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{ padding: '4px' }}
        >
          <MoreVertIcon sx={{ fontSize: 18, color: 'var(--ls-color-muted)' }} />
        </IconButton>
      </div>

      <div className={sty.cardFooter}>
        <div className={sty.cardBadges}>
          <Chip
            label={typeLabel}
            size="small"
            sx={{
              fontFamily,
              fontSize: 11,
              fontWeight: 600,
              height: 22,
              borderRadius: '6px',
              backgroundColor: typeColor.bg,
              color: typeColor.text,
            }}
          />
          {template.is_system && (
            <Chip
              label="System"
              size="small"
              variant="outlined"
              sx={{
                fontFamily,
                fontSize: 11,
                fontWeight: 500,
                height: 22,
                borderRadius: '6px',
                borderColor: 'var(--ls-color-muted-border)',
                color: 'var(--ls-color-muted)',
              }}
            />
          )}
          {!template.is_active && (
            <Chip
              label="Inactive"
              size="small"
              sx={{
                fontFamily,
                fontSize: 11,
                fontWeight: 500,
                height: 22,
                borderRadius: '6px',
                backgroundColor: 'var(--ls-color-destructive-soft)',
                color: 'var(--ls-color-destructive)',
              }}
            />
          )}
        </div>
        <span className={sty.cardMeta}>
          Updated {formatDate(template.updated_at)}
        </span>
      </div>

      <Menu
        anchorEl={menuAnchor}
        open={menuOpen}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        slotProps={{
          paper: {
            sx: {
              fontFamily,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              minWidth: 160,
            },
          },
        }}
      >
        <MenuItem onClick={handleEdit} sx={{ fontFamily, fontSize: 13 }}>
          <ListItemIcon>
            <EditOutlinedIcon sx={{ fontSize: 16 }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontFamily, fontSize: 13 }}>
            Edit
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDuplicate} sx={{ fontFamily, fontSize: 13 }}>
          <ListItemIcon>
            <ContentCopyOutlinedIcon sx={{ fontSize: 16 }} />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontFamily, fontSize: 13 }}>
            Duplicate
          </ListItemText>
        </MenuItem>
        {!template.is_system && (
          <MenuItem onClick={handleArchive} sx={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive)' }}>
            <ListItemIcon>
              <ArchiveOutlinedIcon sx={{ fontSize: 16, color: 'var(--ls-color-destructive)' }} />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontFamily, fontSize: 13, color: 'var(--ls-color-destructive)' }}>
              Archive
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}
