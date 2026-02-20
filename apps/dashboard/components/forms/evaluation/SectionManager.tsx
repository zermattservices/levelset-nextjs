import * as React from 'react';
import {
  TextField,
  IconButton,
  Button,
  Tooltip,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import LockIcon from '@mui/icons-material/Lock';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

interface EvaluationSection {
  id: string;
  name: string;
  name_es?: string;
  order: number;
  is_predefined: boolean;
  max_role_level?: number;
}

interface SectionManagerProps {
  sections: EvaluationSection[];
  onSectionsChange: (sections: EvaluationSection[]) => void;
  roleLevel: number;
}

const textFieldSx = {
  '& .MuiInputLabel-root': {
    fontFamily,
    fontSize: 11,
    color: 'var(--ls-color-muted)',
    '&.Mui-focused': { color: 'var(--ls-color-brand)' },
  },
  '& .MuiInputBase-root': { fontFamily, fontSize: 13 },
  '& .MuiInputBase-input': { fontFamily, fontSize: 13, padding: '8px 10px' },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-muted-border)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--ls-color-border)' },
  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: 'var(--ls-color-brand)',
    borderWidth: '2px',
  },
};

export function SectionManager({
  sections,
  onSectionsChange,
  roleLevel,
}: SectionManagerProps) {
  const sorted = [...sections].sort((a, b) => a.order - b.order);

  const handleNameChange = (id: string, name: string) => {
    onSectionsChange(sections.map((s) => (s.id === id ? { ...s, name } : s)));
  };

  const handleNameEsChange = (id: string, name_es: string) => {
    onSectionsChange(sections.map((s) => (s.id === id ? { ...s, name_es } : s)));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...sorted];
    const prevOrder = updated[index - 1].order;
    updated[index - 1] = { ...updated[index - 1], order: updated[index].order };
    updated[index] = { ...updated[index], order: prevOrder };
    onSectionsChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index >= sorted.length - 1) return;
    const updated = [...sorted];
    const nextOrder = updated[index + 1].order;
    updated[index + 1] = { ...updated[index + 1], order: updated[index].order };
    updated[index] = { ...updated[index], order: nextOrder };
    onSectionsChange(updated);
  };

  const handleDelete = (id: string) => {
    onSectionsChange(sections.filter((s) => s.id !== id));
  };

  const handleAdd = () => {
    if (sections.length >= 10) return;
    const maxOrder = sections.reduce((max, s) => Math.max(max, s.order), -1);
    const newSection: EvaluationSection = {
      id: `sec_custom_${Date.now()}`,
      name: 'New Section',
      name_es: '',
      order: maxOrder + 1,
      is_predefined: false,
    };
    onSectionsChange([...sections, newSection]);
  };

  const isDimmed = (section: EvaluationSection) =>
    section.max_role_level != null && roleLevel > section.max_role_level;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {sorted.map((section, index) => {
        const dimmed = isDimmed(section);
        return (
          <div
            key={section.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid var(--ls-color-muted-border)`,
              background: dimmed ? 'var(--ls-color-neutral-foreground)' : '#fff',
              opacity: dimmed ? 0.55 : 1,
              transition: 'opacity 0.2s',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Tooltip title="Move up">
                  <span>
                    <IconButton
                      size="small"
                      disabled={index === 0}
                      onClick={() => handleMoveUp(index)}
                      sx={{ padding: '1px' }}
                    >
                      <ArrowUpwardIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)' }} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Move down">
                  <span>
                    <IconButton
                      size="small"
                      disabled={index === sorted.length - 1}
                      onClick={() => handleMoveDown(index)}
                      sx={{ padding: '1px' }}
                    >
                      <ArrowDownwardIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)' }} />
                    </IconButton>
                  </span>
                </Tooltip>
              </div>

              <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                <TextField
                  label="Name (EN)"
                  value={section.name}
                  onChange={(e) => handleNameChange(section.id, e.target.value)}
                  size="small"
                  fullWidth
                  sx={textFieldSx}
                />
                <TextField
                  label="Name (ES)"
                  value={section.name_es || ''}
                  onChange={(e) => handleNameEsChange(section.id, e.target.value)}
                  size="small"
                  fullWidth
                  sx={textFieldSx}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {section.is_predefined && (
                  <Tooltip title="Predefined section">
                    <LockIcon sx={{ fontSize: 14, color: 'var(--ls-color-muted)' }} />
                  </Tooltip>
                )}
                {section.max_role_level != null && (
                  <Chip
                    label={`≤ L${section.max_role_level}`}
                    size="small"
                    sx={{
                      fontFamily,
                      fontSize: 10,
                      fontWeight: 600,
                      height: 20,
                      borderRadius: '4px',
                      backgroundColor: 'var(--ls-color-neutral-foreground)',
                      color: 'var(--ls-color-muted)',
                    }}
                  />
                )}
                {!section.is_predefined && (
                  <Tooltip title="Delete section">
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(section.id)}
                      sx={{
                        padding: '2px',
                        '&:hover': { color: 'var(--ls-color-destructive)' },
                      }}
                    >
                      <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </div>
            </div>

            {dimmed && (
              <span
                style={{
                  fontFamily,
                  fontSize: 11,
                  color: 'var(--ls-color-muted)',
                  fontStyle: 'italic',
                  paddingLeft: 36,
                }}
              >
                Not applicable at role level {roleLevel} (max level {section.max_role_level})
              </span>
            )}
          </div>
        );
      })}

      <Button
        size="small"
        startIcon={<AddIcon sx={{ fontSize: 14 }} />}
        onClick={handleAdd}
        disabled={sections.length >= 10}
        sx={{
          fontFamily,
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'none',
          color: 'var(--ls-color-brand)',
          padding: '6px 12px',
          alignSelf: 'flex-start',
          '&:hover': {
            backgroundColor: 'var(--ls-color-brand-soft)',
          },
        }}
      >
        Add Section {sections.length >= 10 && '(max 10)'}
      </Button>
    </div>
  );
}
