import * as React from 'react';
import { Button } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import sty from './ClassicViewContent.module.css';
import { PEAClassic } from '@/components/CodeComponents/PEAClassic';
import { EmbedModal } from '@/components/CodeComponents/EmbedModal';
import { useLocationContext } from '@/components/CodeComponents/LocationContext';

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export function ClassicViewContent() {
  const { selectedLocationId, selectedLocationMobileToken } = useLocationContext();
  const [embedModalOpen, setEmbedModalOpen] = React.useState(false);

  return (
    <div className={sty.container}>
      {/* Header with Embed button */}
      <div className={sty.headerRow}>
        <Button
          variant="outlined"
          startIcon={<CodeIcon sx={{ fontSize: '1em' }} />}
          onClick={() => setEmbedModalOpen(true)}
          sx={{
            fontFamily,
            fontSize: '14px',
            fontWeight: 600,
            textTransform: 'none',
            borderColor: '#31664a',
            borderWidth: '2px',
            color: '#31664a',
            borderRadius: '6px',
            padding: '6px 12px 6px 16px',
            whiteSpace: 'nowrap',
            minWidth: 'auto',
            lineHeight: 1,
            '&:hover': {
              borderColor: '#28543d',
              borderWidth: '2px',
              backgroundColor: 'rgba(49, 102, 74, 0.04)',
            },
          }}
        >
          Embed
        </Button>
      </div>

      {/* Classic PEA Table */}
      <div className={sty.contentWrapper}>
        <PEAClassic
          className={sty.peaClassic}
          defaultArea="FOH"
          defaultTab="overview"
          density="comfortable"
          locationId={selectedLocationId || ''}
          maxWidth="100%"
          width="100%"
        />
      </div>

      {/* Embed Modal */}
      <EmbedModal
        open={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        mobileToken={selectedLocationMobileToken}
      />
    </div>
  );
}

export default ClassicViewContent;
