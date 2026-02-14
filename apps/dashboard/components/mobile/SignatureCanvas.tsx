import * as React from 'react';
import SignatureCanvasLib from 'react-signature-canvas';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';

interface SignatureCanvasProps {
  label: string;
  helperText?: string;
  onSignatureChange: (dataUrl: string) => void;
  value?: string;
  disabled?: boolean;
}

const fontFamily = '"Satoshi", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const levelsetGreen = 'var(--ls-color-brand)';

export function SignatureCanvas({
  label,
  helperText,
  onSignatureChange,
  value,
  disabled = false,
}: SignatureCanvasProps) {
  const sigCanvasRef = React.useRef<SignatureCanvasLib>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = React.useState(300);

  // Resize canvas to fit container
  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setCanvasWidth(containerRef.current.offsetWidth - 2); // -2 for border
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Load initial value
  React.useEffect(() => {
    if (value && sigCanvasRef.current) {
      const canvas = sigCanvasRef.current;
      canvas.clear();
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getCanvas().getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
        }
      };
      img.src = value;
    }
  }, [value]);

  const handleEnd = React.useCallback(() => {
    if (sigCanvasRef.current) {
      const isEmpty = sigCanvasRef.current.isEmpty();
      if (isEmpty) {
        onSignatureChange('');
      } else {
        const dataUrl = sigCanvasRef.current.toDataURL('image/png');
        onSignatureChange(dataUrl);
      }
    }
  }, [onSignatureChange]);

  const handleClear = React.useCallback(() => {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear();
      onSignatureChange('');
    }
  }, [onSignatureChange]);

  return (
    <Box ref={containerRef} sx={{ width: '100%' }}>
      <Typography
        component="label"
        sx={{
          fontFamily,
          fontSize: '14px',
          fontWeight: 500,
          color: '#414651',
          display: 'block',
          mb: 1,
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          border: '1px solid var(--ls-color-border)',
          borderRadius: '8px',
          backgroundColor: disabled ? '#f5f5f5' : '#ffffff',
          overflow: 'hidden',
          touchAction: 'none', // Prevent page scroll while signing
        }}
      >
        <SignatureCanvasLib
          ref={sigCanvasRef}
          canvasProps={{
            width: canvasWidth,
            height: 120,
            style: {
              width: '100%',
              height: '120px',
              cursor: disabled ? 'not-allowed' : 'crosshair',
            },
          }}
          onEnd={handleEnd}
          penColor={levelsetGreen}
          backgroundColor="rgba(255, 255, 255, 0)"
        />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
        {helperText && (
          <Typography
            sx={{
              fontFamily,
              fontSize: '12px',
              color: 'var(--ls-color-muted)',
            }}
          >
            {helperText}
          </Typography>
        )}
        <Button
          size="small"
          onClick={handleClear}
          disabled={disabled}
          sx={{
            fontFamily,
            fontSize: '12px',
            textTransform: 'none',
            color: 'var(--ls-color-muted)',
            ml: 'auto',
            minWidth: 'auto',
            padding: '4px 8px',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              color: 'var(--ls-color-neutral)',
            },
          }}
        >
          Clear
        </Button>
      </Box>
    </Box>
  );
}
